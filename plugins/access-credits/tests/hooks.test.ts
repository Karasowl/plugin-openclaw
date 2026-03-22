import { describe, it, expect, beforeEach } from "vitest";
import { createCreditsStore, type CreditsStore } from "../src/store/credits-store.js";
import { createMessageGateHandler } from "../src/hooks/message-gate.js";
import { createModelGateHandler } from "../src/hooks/model-gate.js";
import { createPromptInjectorHandler } from "../src/hooks/prompt-inject.js";
import { createMessageSendingGateHandler } from "../src/hooks/message-sending-gate.js";
import { createToolGateHandler } from "../src/hooks/tool-gate.js";
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
    handler = createMessageGateHandler(store, baseConfig);
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
    const observeHandler = createMessageGateHandler(store, observeConfig);
    drainCredits(store, "user-1");
    const event = createMessageEvent();
    await observeHandler(event);
    expect(event.messages).toHaveLength(0);
  });

  it("enforces cooldown", async () => {
    const cooldownConfig = { ...baseConfig, cooldownSeconds: 60 };
    const cooldownHandler = createMessageGateHandler(store, cooldownConfig);
    store.getOrCreateUser("user-1");
    store.recordInteraction("user-1");

    const event = createMessageEvent();
    await cooldownHandler(event);
    expect(event.messages).toHaveLength(1);
    expect(event.messages[0]).toContain("Espera");
  });
});

describe("ModelGateHandler", () => {
  let store: CreditsStore;
  let handler: ReturnType<typeof createModelGateHandler>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    handler = createModelGateHandler(store, baseConfig);
  });

  it("returns undefined when user has credits", () => {
    store.getOrCreateUser("user-1");
    const result = handler({
      type: "model", action: "resolve", sessionKey: "test",
      context: { senderId: "user-1" },
    });
    expect(result).toBeUndefined();
  });

  it("returns fallback model when user has no credits", () => {
    drainCredits(store, "user-1");
    const result = handler({
      type: "model", action: "resolve", sessionKey: "test",
      context: { senderId: "user-1" },
    });
    expect(result).toEqual({ model: "cheapest" });
  });

  it("bypasses for admin users", () => {
    drainCredits(store, "admin-1");
    const result = handler({
      type: "model", action: "resolve", sessionKey: "test",
      context: { senderId: "admin-1" },
    });
    expect(result).toBeUndefined();
  });
});

describe("PromptInjectorHandler", () => {
  let store: CreditsStore;
  let handler: ReturnType<typeof createPromptInjectorHandler>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    handler = createPromptInjectorHandler(store, baseConfig);
  });

  it("injects credit info when user has credits", () => {
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
    expect(injected).toContain("has 10 credits");
    expect(injected).toContain("access_credits_deduct");
  });

  it("injects block instruction when user has no credits", () => {
    drainCredits(store, "user-1");
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

  it("only evaluates contributions for messages above minLength", () => {
    store.getOrCreateUser("user-1");
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
    const observeHandler = createPromptInjectorHandler(store, observeConfig);
    store.getOrCreateUser("user-1");
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
    handler = createToolGateHandler(store, baseConfig);
  });

  it("allows tool calls when user has credits", () => {
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

  it("blocks tool calls when user has no credits", () => {
    drainCredits(store, "user-1");
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

  it("always allows access-credits own tools", () => {
    drainCredits(store, "user-1");
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

  it("bypasses admin users", () => {
    drainCredits(store, "admin-1");
    let blocked = false;
    handler({
      type: "tool", action: "call", sessionKey: "test",
      context: {
        senderId: "admin-1",
        toolName: "some_tool",
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
    handler = createMessageSendingGateHandler(store, baseConfig);
  });

  it("does not modify when user has credits", () => {
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

  it("replaces content when user has no credits", () => {
    drainCredits(store, "user-1");
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

  it("bypasses admin users", () => {
    drainCredits(store, "admin-1");
    let replaced = false;
    handler({
      type: "message", action: "sending", sessionKey: "test",
      context: {
        senderId: "admin-1",
        content: "bot response",
        replaceContent: () => { replaced = true; },
        cancel: () => {},
      },
    });
    expect(replaced).toBe(false);
  });
});
