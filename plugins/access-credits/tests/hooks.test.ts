import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCreditsStore, type CreditsStore } from "../src/store/credits-store.js";
import { createMessageGateHandler } from "../src/hooks/message-gate.js";
import { createModelGateHandler } from "../src/hooks/model-gate.js";
import { createPromptInjectorHandler } from "../src/hooks/prompt-inject.js";
import { createMessageSendingGateHandler } from "../src/hooks/message-sending-gate.js";
import { createToolGateHandler } from "../src/hooks/tool-gate.js";
import { createGroupsStore } from "../src/store/groups-store.js";
import {
  markSessionTriggered,
  markSessionDenied,
  clearSession,
  isSessionTriggered,
  isSessionDenied,
  setSender,
  setChannelSession,
  getSessionKeyByChannel,
} from "../src/gate-state.js";
import type { AccessCreditsConfig } from "../src/config.js";

function createMockRuntimeStore() {
  const data: Record<string, unknown> = {};
  return {
    get: (key: string) => data[key],
    set: (key: string, value: unknown) => {
      data[key] = value;
    },
  };
}

const baseConfig: AccessCreditsConfig = {
  mode: "enforce",
  initialCredits: 10,
  costPerMessage: 1,
  triggerHashtags: ["#ask", "#bot"],
  triggerCommands: ["/ask", "/bot"],
  adminUsers: ["admin-1"],
  fallbackModel: "cheapest",
  evaluateContributions: true,
  contributionReward: 2,
  contributionMinLength: 100,
  cooldownSeconds: 0,
};

const observeConfig: AccessCreditsConfig = { ...baseConfig, mode: "observe" };

function drainCredits(store: CreditsStore, userId: string) {
  store.getOrCreateUser(userId);
  for (let i = 0; i < 10; i++) {
    store.deductCredits(userId, 1, "drain");
  }
}

// --- Helpers for InternalHookEvent (message:received) ---

function createMessageEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: "message",
    action: "received",
    sessionKey: "test-session",
    timestamp: new Date(),
    messages: [] as string[],
    context: {
      from: "user-1",
      content: "#ask what is AI?",
      channelId: "telegram",
      metadata: {
        senderId: "user-1",
        senderName: "Alice",
      },
      ...((overrides.context as Record<string, unknown>) ?? {}),
    },
    ...overrides,
  };
}

// --- Helpers for lifecycle hooks ---

function setupTriggeredSession(
  sessionKey: string,
  senderId: string,
  channelId = "telegram",
  conversationId = "chat-1",
  accountId = "bot-1",
) {
  markSessionTriggered(sessionKey);
  setSender(sessionKey, senderId);
  setChannelSession({ channelId, accountId, conversationId, senderId }, sessionKey);
}

// =====================================================================
// MessageGateHandler — uses registerHook("message:received")
// Event shape: InternalHookEvent (type, action, sessionKey, context, messages)
// =====================================================================

describe("MessageGateHandler", () => {
  let store: CreditsStore;
  let handler: ReturnType<typeof createMessageGateHandler>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    handler = createMessageGateHandler(store, () => baseConfig);
  });

  it("allows message when user has credits", async () => {
    const event = createMessageEvent();
    await handler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("blocks message when user has no credits", async () => {
    drainCredits(store, "user-1");
    const event = createMessageEvent();
    await handler(event);
    expect(event.messages).toHaveLength(1);
    expect(event.messages[0]).toContain("enough credits");
  });

  it("ignores messages without triggers", async () => {
    const event = createMessageEvent({
      context: { content: "hello everyone", from: "user-1", channelId: "telegram", metadata: { senderId: "user-1" } },
    });
    await handler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("bypasses check for admin users", async () => {
    drainCredits(store, "admin-1");
    const event = createMessageEvent({
      context: { content: "#ask something", from: "admin-1", channelId: "telegram", metadata: { senderId: "admin-1" } },
    });
    await handler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("ignores non-message events", async () => {
    const event = createMessageEvent({ type: "command", action: "new" });
    await handler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("matches /ask command trigger", async () => {
    drainCredits(store, "user-1");
    const event = createMessageEvent({
      context: { content: "/ask what is the meaning of life?", from: "user-1", channelId: "telegram", metadata: { senderId: "user-1" } },
    });
    await handler(event);
    expect(event.messages).toHaveLength(1);
  });

  it("does not block in observe mode", async () => {
    const observeHandler = createMessageGateHandler(store, () => observeConfig);
    drainCredits(store, "user-1");
    const event = createMessageEvent();
    await observeHandler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("allows first query even with cooldown enabled", async () => {
    const cooldownConfig = { ...baseConfig, cooldownSeconds: 60 };
    const cooldownHandler = createMessageGateHandler(store, () => cooldownConfig);
    const uid = "cooldown-user-1";
    store.getOrCreateUser(uid);

    const event = createMessageEvent({
      context: { content: "#ask test", from: uid, channelId: "telegram", metadata: { senderId: uid } },
    });
    await cooldownHandler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("enforces cooldown on second query", async () => {
    const cooldownConfig = { ...baseConfig, cooldownSeconds: 60 };
    const cooldownHandler = createMessageGateHandler(store, () => cooldownConfig);
    const uid = "cooldown-user-2";
    store.getOrCreateUser(uid);

    // First query passes and records interaction
    const event1 = createMessageEvent({
      context: { content: "#ask first", from: uid, channelId: "telegram", metadata: { senderId: uid } },
    });
    await cooldownHandler(event1);
    expect(event1.messages).toHaveLength(0);

    // Second query is blocked by cooldown
    const event2 = createMessageEvent({
      sessionKey: "test-session-2",
      context: { content: "#ask second", from: uid, channelId: "telegram", metadata: { senderId: uid } },
    });
    await cooldownHandler(event2);
    expect(event2.messages).toHaveLength(1);
    expect(event2.messages[0]).toContain("wait");
  });

  it("stores sender and channel in gate-state for lifecycle hooks", async () => {
    const event = createMessageEvent();
    await handler(event);
    // After processing, the session should be triggered and sender/channel mapped
    expect(isSessionTriggered("test-session")).toBe(true);
  });

  it("deducts credits at admission time (not deferred to message_sending)", async () => {
    store.getOrCreateUser("user-1");
    const event = createMessageEvent();
    await handler(event);
    expect(event.messages).toHaveLength(0); // admitted
    const user = store.getUser("user-1")!;
    expect(user.credits).toBe(9); // 10 - 1 deducted at admission
  });

  it("does not deduct credits in observe mode", async () => {
    const observeHandler = createMessageGateHandler(store, () => observeConfig);
    store.getOrCreateUser("user-1");
    const event = createMessageEvent();
    await observeHandler(event);
    expect(event.messages).toHaveLength(0);
    const user = store.getUser("user-1")!;
    expect(user.credits).toBe(10); // unchanged
  });

  it("normalizes Telegram chat ids and stores the detected chat title", async () => {
    const groupsStore = createGroupsStore(createMockRuntimeStore());
    const groupHandler = createMessageGateHandler(store, () => baseConfig, groupsStore);

    const event = createMessageEvent({
      context: {
        conversationId: "telegram:-1001484119586",
        metadata: {
          senderId: "user-1",
          chat: {
            id: "-1001484119586",
            title: "OpenClaw Operators",
          },
        },
      },
    });

    await groupHandler(event);

    expect(groupsStore.getAll()).toEqual([
      expect.objectContaining({
        chatId: "-1001484119586",
        chatTitle: "OpenClaw Operators",
      }),
    ]);
  });

  it("does not use the channel type as a fallback group id", async () => {
    const groupsStore = createGroupsStore(createMockRuntimeStore());
    const groupHandler = createMessageGateHandler(store, () => baseConfig, groupsStore);

    const event = createMessageEvent({
      context: {
        conversationId: undefined,
        metadata: {
          senderId: "user-1",
        },
      },
    });

    await groupHandler(event);

    expect(groupsStore.getAll()).toHaveLength(0);
  });
});

describe("GroupsStore", () => {
  it("migrates legacy telegram-prefixed ids and refreshes names from Telegram", async () => {
    const groupsStore = createGroupsStore(createMockRuntimeStore());
    groupsStore.upsert("telegram:-1001484119586", "Chat telegram:-1001484119586");

    const telegramClient = {
      getMe: vi.fn(),
      getChat: vi.fn(async () => ({
        id: -1001484119586,
        type: "supergroup" as const,
        title: "Team Control Room",
      })),
      getChatMembersCount: vi.fn(async () => 24),
      getChatAdministrators: vi.fn(),
    };

    const groups = await groupsStore.refreshFromTelegram(telegramClient);

    expect(telegramClient.getChat).toHaveBeenCalledWith("-1001484119586");
    expect(telegramClient.getChatMembersCount).toHaveBeenCalledWith("-1001484119586");
    expect(groups).toEqual([
      expect.objectContaining({
        chatId: "-1001484119586",
        chatTitle: "Team Control Room",
        memberCount: 24,
      }),
    ]);
    expect(groupsStore.getById("telegram:-1001484119586")).toEqual(
      expect.objectContaining({
        chatId: "-1001484119586",
        chatTitle: "Team Control Room",
      }),
    );
  });
});

// =====================================================================
// ModelGateHandler — uses api.on("before_model_resolve")
// Contract: (event: { prompt }, ctx: { sessionKey? }) => { modelOverride? } | void
// =====================================================================

describe("ModelGateHandler", () => {
  let store: CreditsStore;
  let handler: ReturnType<typeof createModelGateHandler>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    handler = createModelGateHandler(store, () => baseConfig);
    clearSession("test");
  });

  it("returns undefined when session is not triggered", () => {
    store.getOrCreateUser("user-1");
    const result = handler(
      { prompt: "hello" },
      { sessionKey: "test" },
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined when session is triggered but not denied", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1");
    const result = handler(
      { prompt: "hello" },
      { sessionKey: "test" },
    );
    expect(result).toBeUndefined();
  });

  it("returns modelOverride when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    setupTriggeredSession("test", "user-1");
    markSessionDenied("test", "no_credits");
    const result = handler(
      { prompt: "hello" },
      { sessionKey: "test" },
    );
    expect(result).toEqual({ modelOverride: "cheapest" });
  });

  it("returns undefined when no sessionKey in context", () => {
    setupTriggeredSession("test", "user-1");
    markSessionDenied("test", "no_credits");
    const result = handler(
      { prompt: "hello" },
      {},  // no sessionKey
    );
    expect(result).toBeUndefined();
  });
});

// =====================================================================
// PromptInjectorHandler — uses api.on("before_prompt_build")
// Contract: (event: { prompt, messages }, ctx: { sessionKey? }) => { appendSystemContext? } | void
// =====================================================================

describe("PromptInjectorHandler", () => {
  let store: CreditsStore;
  let handler: ReturnType<typeof createPromptInjectorHandler>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    handler = createPromptInjectorHandler(store, () => baseConfig);
    clearSession("test");
  });

  it("injects credit info when session is triggered and user has credits", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1");
    const result = handler(
      { prompt: "x".repeat(150), messages: [] },
      { sessionKey: "test" },
    );
    expect(result).toBeDefined();
    expect(result!.appendSystemContext).toContain("has 10 credits");
    expect(result!.appendSystemContext).toContain("deducted automatically");
    expect(result!.appendSystemContext).not.toContain("access_credits_deduct");
  });

  it("injects block instruction when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    setupTriggeredSession("test", "user-1");
    markSessionDenied("test", "no_credits");
    const result = handler(
      { prompt: "hello", messages: [] },
      { sessionKey: "test" },
    );
    expect(result).toBeDefined();
    expect(result!.appendSystemContext).toContain("DO NOT process");
    expect(result!.appendSystemContext).toContain("0 credits");
  });

  it("injects cooldown instruction when denied for cooldown", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1");
    markSessionDenied("test", "cooldown");
    const result = handler(
      { prompt: "hello", messages: [] },
      { sessionKey: "test" },
    );
    expect(result).toBeDefined();
    expect(result!.appendSystemContext).toContain("cooldown");
    expect(result!.appendSystemContext).toContain("DO NOT process");
    expect(result!.appendSystemContext).not.toContain("credits");
  });

  it("does nothing when session is not triggered", () => {
    store.getOrCreateUser("user-1");
    const result = handler(
      { prompt: "x".repeat(150), messages: [] },
      { sessionKey: "test" },
    );
    expect(result).toBeUndefined();
  });

  it("only evaluates contributions for messages above minLength", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1");

    // Short prompt: no contribution evaluation
    const shortResult = handler(
      { prompt: "short", messages: [] },
      { sessionKey: "test" },
    );
    expect(shortResult?.appendSystemContext).not.toContain("access_credits_award");

    // Long prompt: includes contribution evaluation
    const longResult = handler(
      { prompt: "x".repeat(150), messages: [] },
      { sessionKey: "test" },
    );
    expect(longResult?.appendSystemContext).toContain("access_credits_award");
  });

  it("skips injection in observe mode", () => {
    const observeHandler = createPromptInjectorHandler(store, () => observeConfig);
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1");
    const result = observeHandler(
      { prompt: "hello", messages: [] },
      { sessionKey: "test" },
    );
    expect(result).toBeUndefined();
  });

  it("bypasses admin users", () => {
    store.getOrCreateUser("admin-1");
    drainCredits(store, "admin-1");
    setupTriggeredSession("test", "admin-1");
    markSessionDenied("test", "no_credits");
    const result = handler(
      { prompt: "hello", messages: [] },
      { sessionKey: "test" },
    );
    expect(result).toBeUndefined();
  });
});

// =====================================================================
// ToolGateHandler — uses api.on("before_tool_call")
// Contract: (event: { toolName, params }, ctx: { sessionKey? }) => { block?, blockReason? } | void
// =====================================================================

describe("ToolGateHandler", () => {
  let store: CreditsStore;
  let handler: ReturnType<typeof createToolGateHandler>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    handler = createToolGateHandler(store, () => baseConfig);
    clearSession("test");
  });

  it("allows tool calls when session is not triggered", () => {
    store.getOrCreateUser("user-1");
    const result = handler(
      { toolName: "some_tool", params: {} },
      { sessionKey: "test", toolName: "some_tool" },
    );
    expect(result).toBeUndefined();
  });

  it("allows tool calls when session is triggered but not denied", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1");
    const result = handler(
      { toolName: "some_tool", params: {} },
      { sessionKey: "test", toolName: "some_tool" },
    );
    expect(result).toBeUndefined();
  });

  it("blocks tool calls when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    setupTriggeredSession("test", "user-1");
    markSessionDenied("test", "no_credits");
    const result = handler(
      { toolName: "some_tool", params: {} },
      { sessionKey: "test", toolName: "some_tool" },
    );
    expect(result).toEqual({
      block: true,
      blockReason: "Access denied: user does not have enough credits to use tools.",
    });
  });

  it("always allows access-credits own tools even when denied", () => {
    drainCredits(store, "user-1");
    setupTriggeredSession("test", "user-1");
    markSessionDenied("test", "no_credits");
    const result = handler(
      { toolName: "access_credits_check_balance", params: {} },
      { sessionKey: "test", toolName: "access_credits_check_balance" },
    );
    expect(result).toBeUndefined();
  });
});

// =====================================================================
// MessageSendingGateHandler — uses api.on("message_sending")
// Contract: (event: { to, content }, ctx: { channelId }) => { content?, cancel? } | void
// NOTE: No sessionKey — uses channelId bridge from gate-state
// =====================================================================

describe("MessageSendingGateHandler", () => {
  let store: CreditsStore;
  let handler: ReturnType<typeof createMessageSendingGateHandler>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    handler = createMessageSendingGateHandler(store, () => baseConfig);
    clearSession("test");
  });

  it("does nothing when session is not triggered", () => {
    store.getOrCreateUser("user-1");
    const result = handler(
      { to: "user-1", content: "bot response" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(result).toBeUndefined();
  });

  it("passes through when session is triggered and allowed (no deduction here)", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1", "telegram");
    const result = handler(
      { to: "user-1", content: "bot response" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    // Credits are deducted in message:received, not here
    expect(result).toBeUndefined();
    const user = store.getUser("user-1")!;
    expect(user.credits).toBe(10); // unchanged — deduction is at admission
  });

  it("replaces content when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    setupTriggeredSession("test", "user-1", "telegram");
    markSessionDenied("test", "no_credits");
    const result = handler(
      { to: "user-1", content: "bot response" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(result).toBeDefined();
    expect(result!.content).toContain("enough credits");
  });

  it("shows cooldown message when denied for cooldown", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1", "telegram");
    markSessionDenied("test", "cooldown");
    const result = handler(
      { to: "user-1", content: "bot response" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(result).toBeDefined();
    expect(result!.content).toContain("wait");
    expect(result!.content).not.toContain("créditos");
  });

  it("passes through for admitted sessions regardless of user role", () => {
    store.getOrCreateUser("admin-1");
    setupTriggeredSession("test", "admin-1", "telegram");
    const result = handler(
      { to: "admin-1", content: "bot response" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(result).toBeUndefined();
    const user = store.getUser("admin-1")!;
    expect(user.credits).toBe(10); // unchanged
  });

  it("clears session state after handling", () => {
    store.getOrCreateUser("user-1");
    setupTriggeredSession("test", "user-1", "telegram");
    handler(
      { to: "user-1", content: "bot response" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    // Session should be cleared after handling
    expect(isSessionTriggered("test")).toBe(false);
  });
});

// =====================================================================
// GateState sessionKey reuse
// =====================================================================
  
describe("GateState sessionKey reuse", () => {
  it("does not carry stale denial when sessionKey is reused", () => {
    // Simulate a denied session that was never cleaned up
    markSessionTriggered("reuse-key");
    markSessionDenied("reuse-key", "no_credits");
    // Normally message-sending-gate would clearSession, but imagine it never fires

    // Now a new interaction reuses the same sessionKey
    markSessionTriggered("reuse-key");
    // The old denial should have been cleared by markSessionTriggered
    expect(isSessionTriggered("reuse-key")).toBe(true);
    expect(isSessionDenied("reuse-key")).toBe(false);
  });

  it("purges old bridge entry when sessionKey is reused in a different conversation", () => {
    const oldBridge = { channelId: "telegram", accountId: "bot-1", conversationId: "chat-old", senderId: "user-1" };
    const newBridge = { channelId: "telegram", accountId: "bot-1", conversationId: "chat-new", senderId: "user-1" };

    // First use: register reuse-key on chat-old
    markSessionTriggered("reuse-key");
    setChannelSession(oldBridge, "reuse-key");
    expect(getSessionKeyByChannel(oldBridge)).toBe("reuse-key");

    // Second use: OpenClaw reuses reuse-key on chat-new
    markSessionTriggered("reuse-key");
    setChannelSession(newBridge, "reuse-key");

    // Old bridge must NOT return the reused key
    expect(getSessionKeyByChannel(oldBridge)).toBeNull();
    // New bridge returns it correctly
    expect(getSessionKeyByChannel(newBridge)).toBe("reuse-key");

    clearSession("reuse-key");
  });
});

// =====================================================================
// GateState FIFO queue (concurrent sessions)
// =====================================================================

describe("GateState FIFO queue", () => {
  const bridgeKey = { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1", senderId: "user-1" };

  beforeEach(() => {
    clearSession("sk-1");
    clearSession("sk-2");
    clearSession("sk-3");
  });

  it("returns sessions in FIFO order for the same sender", () => {
    markSessionTriggered("sk-1");
    setChannelSession(bridgeKey, "sk-1");
    markSessionTriggered("sk-2");
    setChannelSession(bridgeKey, "sk-2");

    // First lookup returns the oldest session
    expect(getSessionKeyByChannel(bridgeKey)).toBe("sk-1");

    // After clearing sk-1, next lookup returns sk-2
    clearSession("sk-1");
    expect(getSessionKeyByChannel(bridgeKey)).toBe("sk-2");
  });

  it("does not let a second message overwrite the first session", () => {
    markSessionTriggered("sk-1");
    setChannelSession(bridgeKey, "sk-1");
    markSessionTriggered("sk-2");
    setChannelSession(bridgeKey, "sk-2");

    // sk-1 is still accessible
    expect(getSessionKeyByChannel(bridgeKey)).toBe("sk-1");
  });

  it("clearSession removes the bridge entry for that session only", () => {
    markSessionTriggered("sk-1");
    setChannelSession(bridgeKey, "sk-1");
    markSessionTriggered("sk-2");
    setChannelSession(bridgeKey, "sk-2");

    clearSession("sk-1");
    // sk-2 is still in the queue
    expect(getSessionKeyByChannel(bridgeKey)).toBe("sk-2");

    clearSession("sk-2");
    // Queue is now empty
    expect(getSessionKeyByChannel(bridgeKey)).toBeNull();
  });

  it("skips stale (already cleared) entries at the front of the queue", () => {
    markSessionTriggered("sk-1");
    setChannelSession(bridgeKey, "sk-1");
    markSessionTriggered("sk-2");
    setChannelSession(bridgeKey, "sk-2");

    // Clear sk-1 without going through getSessionKeyByChannel
    clearSession("sk-1");

    // getSessionKeyByChannel should skip the stale sk-1 and return sk-2
    expect(getSessionKeyByChannel(bridgeKey)).toBe("sk-2");
  });

  it("returns null when all sessions in queue are stale", () => {
    markSessionTriggered("sk-1");
    setChannelSession(bridgeKey, "sk-1");
    clearSession("sk-1");

    expect(getSessionKeyByChannel(bridgeKey)).toBeNull();
  });

  it("concurrent sessions are consumed in FIFO order by message_sending", () => {
    const store = createCreditsStore(createMockRuntimeStore(), 10);
    const handler = createMessageSendingGateHandler(store, () => baseConfig);
    store.getOrCreateUser("user-1");

    // Two messages admitted (credits deducted at admission, not here)
    setupTriggeredSession("sk-1", "user-1", "telegram");
    setupTriggeredSession("sk-2", "user-1", "telegram");

    // First response consumes sk-1
    const r1 = handler(
      { to: "user-1", content: "response 1" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(r1).toBeUndefined();
    // Credits unchanged in message_sending (deducted at admission)
    expect(store.getUser("user-1")!.credits).toBe(10);

    // Second response consumes sk-2
    const r2 = handler(
      { to: "user-1", content: "response 2" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(r2).toBeUndefined();
  });

  it("out-of-order responses: billing unaffected, only denial message may swap", () => {
    // This test documents the known FIFO limitation:
    // If responses arrive out of order, the bridge may match the wrong session.
    // Because credits are deducted at admission (in message:received),
    // the billing impact is zero — only the denial message type could swap.
    const store = createCreditsStore(createMockRuntimeStore(), 10);
    const handler = createMessageSendingGateHandler(store, () => baseConfig);
    store.getOrCreateUser("user-1");

    // sk-1: admitted (user has credits)
    setupTriggeredSession("sk-1", "user-1", "telegram");
    // sk-2: denied (cooldown)
    setupTriggeredSession("sk-2", "user-1", "telegram");
    markSessionDenied("sk-2", "cooldown");

    // Simulate out-of-order: sk-2's response arrives first
    // FIFO returns sk-1 (admitted) → passes through
    const r1 = handler(
      { to: "user-1", content: "response to sk-2 (out of order)" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(r1).toBeUndefined(); // sk-1 was admitted → pass through

    // sk-1's response arrives second
    // FIFO returns sk-2 (denied/cooldown) → replaces content
    const r2 = handler(
      { to: "user-1", content: "response to sk-1 (out of order)" },
      { channelId: "telegram", accountId: "bot-1", conversationId: "chat-1" },
    );
    expect(r2).toBeDefined();
    expect(r2!.content).toContain("wait"); // cooldown message

    // Key invariant: credits are unchanged in message_sending.
    // The user paid exactly once (at admission in message:received).
    // The FIFO mismatch only swapped which response got the denial message.
    expect(store.getUser("user-1")!.credits).toBe(10);
  });
});
