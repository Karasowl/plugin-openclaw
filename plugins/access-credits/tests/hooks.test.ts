import { describe, it, expect, beforeEach } from "vitest";
import { createCreditsStore, type CreditsStore } from "../src/store/credits-store.js";
import { createMessageGateHandler } from "../src/hooks/message-gate.js";
import { createModelGateHandler } from "../src/hooks/model-gate.js";
import { createPromptInjectorHandler } from "../src/hooks/prompt-inject.js";
import { createMessageSendingGateHandler } from "../src/hooks/message-sending-gate.js";
import { createToolGateHandler } from "../src/hooks/tool-gate.js";
import { markSessionTriggered, markSessionDenied, clearSession, isSessionTriggered, isSessionDenied } from "../src/gate-state.js";
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
    expect(event.messages[0]).toContain("créditos suficientes");
  });

  it("ignores messages without triggers", async () => {
    const event = createMessageEvent({
      context: { content: "hello everyone", from: "user-1", metadata: { senderId: "user-1" } },
    });
    await handler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("bypasses check for admin users", async () => {
    drainCredits(store, "admin-1");
    const event = createMessageEvent({
      context: { content: "#ask something", from: "admin-1", metadata: { senderId: "admin-1" } },
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
      context: { content: "/ask what is the meaning of life?", from: "user-1", metadata: { senderId: "user-1" } },
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
      context: { content: "#ask test", from: uid, metadata: { senderId: uid } },
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
      context: { content: "#ask first", from: uid, metadata: { senderId: uid } },
    });
    await cooldownHandler(event1);
    expect(event1.messages).toHaveLength(0);

    // Second query is blocked by cooldown
    const event2 = createMessageEvent({
      sessionKey: "test-session-2",
      context: { content: "#ask second", from: uid, metadata: { senderId: uid } },
    });
    await cooldownHandler(event2);
    expect(event2.messages).toHaveLength(1);
    expect(event2.messages[0]).toContain("Espera");
  });
});

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
    const result = handler({
      type: "model", action: "resolve", sessionKey: "test",
      context: { senderId: "user-1" },
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined when session is triggered but not denied", () => {
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    const result = handler({
      type: "model", action: "resolve", sessionKey: "test",
      context: { senderId: "user-1" },
    });
    expect(result).toBeUndefined();
  });

  it("returns fallback model when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    markSessionTriggered("test");
    markSessionDenied("test", "no_credits");
    const result = handler({
      type: "model", action: "resolve", sessionKey: "test",
      context: { senderId: "user-1" },
    });
    expect(result).toEqual({ model: "cheapest" });
  });
});

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
    markSessionTriggered("test");
    let injected = "";
    handler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "x".repeat(150),
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).toContain("has 10 credits");
    expect(injected).toContain("deducted automatically");
    expect(injected).not.toContain("access_credits_deduct");
  });

  it("injects block instruction when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    markSessionTriggered("test");
    markSessionDenied("test", "no_credits");
    let injected = "";
    handler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "user-1",
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).toContain("DO NOT process");
    expect(injected).toContain("0 credits");
  });

  it("injects cooldown instruction when denied for cooldown", () => {
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    markSessionDenied("test", "cooldown");
    let injected = "";
    handler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "user-1",
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).toContain("cooldown");
    expect(injected).toContain("DO NOT process");
    expect(injected).not.toContain("credits");
  });

  it("does nothing when session is not triggered", () => {
    store.getOrCreateUser("user-1");
    let injected = "";
    handler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "x".repeat(150),
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).toBe("");
  });

  it("only evaluates contributions for messages above minLength", () => {
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    let injected = "";
    // Short message: no contribution evaluation
    handler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "short",
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).not.toContain("access_credits_award");

    // Long message: includes contribution evaluation
    injected = "";
    handler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "x".repeat(150),
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).toContain("access_credits_award");
  });

  it("skips injection in observe mode", () => {
    const observeHandler = createPromptInjectorHandler(store, () => observeConfig);
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    let injected = "";
    observeHandler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "user-1",
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).toBe("");
  });

  it("bypasses admin users", () => {
    store.getOrCreateUser("admin-1");
    drainCredits(store, "admin-1");
    markSessionTriggered("test");
    markSessionDenied("test", "no_credits");
    let injected = "";
    handler({
      type: "agent", action: "prompt_build", sessionKey: "test",
      context: {
        senderId: "admin-1",
        appendSystemContext: (text: string) => { injected = text; },
      },
    });
    expect(injected).toBe("");
  });
});

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
    let blocked = false;
    handler({
      type: "tool", action: "call", sessionKey: "test",
      context: {
        senderId: "user-1",
        toolName: "some_tool",
        block: () => { blocked = true; },
      },
    });
    expect(blocked).toBe(false);
  });

  it("allows tool calls when session is triggered but not denied", () => {
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    let blocked = false;
    handler({
      type: "tool", action: "call", sessionKey: "test",
      context: {
        senderId: "user-1",
        toolName: "some_tool",
        block: () => { blocked = true; },
      },
    });
    expect(blocked).toBe(false);
  });

  it("blocks tool calls when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    markSessionTriggered("test");
    markSessionDenied("test", "no_credits");
    let blocked = false;
    handler({
      type: "tool", action: "call", sessionKey: "test",
      context: {
        senderId: "user-1",
        toolName: "some_tool",
        block: () => { blocked = true; },
      },
    });
    expect(blocked).toBe(true);
  });

  it("always allows access-credits own tools even when denied", () => {
    drainCredits(store, "user-1");
    markSessionTriggered("test");
    markSessionDenied("test", "no_credits");
    let blocked = false;
    handler({
      type: "tool", action: "call", sessionKey: "test",
      context: {
        senderId: "user-1",
        toolName: "access_credits_check_balance",
        block: () => { blocked = true; },
      },
    });
    expect(blocked).toBe(false);
  });
});

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
    let replaced = false;
    let cancelled = false;
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: () => { replaced = true; },
        cancel: () => { cancelled = true; },
      },
    });
    expect(replaced).toBe(false);
    expect(cancelled).toBe(false);
  });

  it("auto-deducts credits when session is triggered and allowed", () => {
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: () => {},
        cancel: () => {},
      },
    });
    const user = store.getUser("user-1")!;
    expect(user.credits).toBe(9); // 10 - 1 auto-deducted
  });

  it("replaces content when session is triggered and denied", () => {
    drainCredits(store, "user-1");
    markSessionTriggered("test");
    markSessionDenied("test", "no_credits");
    let replacedWith = "";
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: (c: string) => { replacedWith = c; },
        cancel: () => {},
      },
    });
    expect(replacedWith).toContain("créditos suficientes");
  });

  it("shows cooldown message when denied for cooldown", () => {
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    markSessionDenied("test", "cooldown");
    let replacedWith = "";
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: (c: string) => { replacedWith = c; },
        cancel: () => {},
      },
    });
    expect(replacedWith).toContain("Espera");
    expect(replacedWith).not.toContain("créditos");
  });

  it("does not deduct for admin users", () => {
    store.getOrCreateUser("admin-1");
    markSessionTriggered("test");
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "admin-1",
        content: "bot response",
        replaceContent: () => {},
        cancel: () => {},
      },
    });
    const user = store.getUser("admin-1")!;
    expect(user.credits).toBe(10); // unchanged
  });

  it("blocks response when race condition exhausts credits", () => {
    store.getOrCreateUser("user-1");
    // Drain credits to simulate race: admission passed but credits gone
    drainCredits(store, "user-1");
    markSessionTriggered("test");
    // NOT marked denied - message-gate admitted this session
    let replacedWith = "";
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: (c: string) => { replacedWith = c; },
        cancel: () => {},
      },
    });
    expect(replacedWith).toContain("créditos suficientes");
  });

  it("does not deduct credits in observe mode", () => {
    const observeHandler = createMessageSendingGateHandler(store, () => observeConfig);
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    observeHandler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: () => {},
        cancel: () => {},
      },
    });
    const user = store.getUser("user-1")!;
    expect(user.credits).toBe(10); // unchanged in observe mode
  });

  it("clears session state after handling", () => {
    store.getOrCreateUser("user-1");
    markSessionTriggered("test");
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: () => {},
        cancel: () => {},
      },
    });
    // Session should be cleared after handling
    // A second call should do nothing (not triggered anymore)
    let replaced = false;
    markSessionDenied("test", "no_credits"); // try to mark denied after clear
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "user-1",
        content: "bot response",
        replaceContent: () => { replaced = true; },
        cancel: () => {},
      },
    });
    // Not triggered, so should not replace
    expect(replaced).toBe(false);
  });
});

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
});
