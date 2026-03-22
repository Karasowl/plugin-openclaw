import { describe, it, expect, beforeEach } from "vitest";
import { createCreditsStore, type CreditsStore } from "../src/store/credits-store.js";
import { createCheckBalanceTool } from "../src/tools/check-balance.js";
import { createDeductCreditsTool } from "../src/tools/deduct-credits.js";
import { createAwardCreditsTool } from "../src/tools/award-credits.js";

function createMockRuntimeStore() {
  const data: Record<string, unknown> = {};
  return {
    get: (key: string) => data[key],
    set: (key: string, value: unknown) => {
      data[key] = value;
    },
  };
}

describe("CheckBalanceTool", () => {
  let store: CreditsStore;
  let tool: ReturnType<typeof createCheckBalanceTool>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    tool = createCheckBalanceTool(store);
  });

  it("returns user balance info", async () => {
    store.getOrCreateUser("user-1", "Alice");
    const result = await tool.execute("session", { userId: "user-1" });
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.credits).toBe(10);
    expect(parsed.displayName).toBe("Alice");
  });

  it("returns not found for unknown user", async () => {
    const result = await tool.execute("session", { userId: "ghost" });
    expect(result.content[0].text).toContain("not found");
  });
});

describe("DeductCreditsTool", () => {
  let store: CreditsStore;
  let tool: ReturnType<typeof createDeductCreditsTool>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    tool = createDeductCreditsTool(store);
  });

  it("deducts credits successfully", async () => {
    store.getOrCreateUser("user-1");
    const result = await tool.execute("session", {
      userId: "user-1",
      amount: 3,
      reason: "bot interaction",
    });
    expect(result.content[0].text).toContain("Deducted 3");
    expect(result.content[0].text).toContain("balance: 7");
  });

  it("fails when insufficient credits", async () => {
    store.getOrCreateUser("user-1");
    const result = await tool.execute("session", {
      userId: "user-1",
      amount: 15,
      reason: "too much",
    });
    expect(result.content[0].text).toContain("Failed");
    expect(result.content[0].text).toContain("insufficient");
  });
});

describe("AwardCreditsTool", () => {
  let store: CreditsStore;
  let tool: ReturnType<typeof createAwardCreditsTool>;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
    tool = createAwardCreditsTool(store);
  });

  it("awards credits successfully", async () => {
    store.getOrCreateUser("user-1");
    const result = await tool.execute("session", {
      userId: "user-1",
      amount: 5,
      reason: "shared a great resource",
    });
    expect(result.content[0].text).toContain("Awarded 5");
    expect(result.content[0].text).toContain("balance: 15");
  });

  it("creates user if needed when awarding", async () => {
    const result = await tool.execute("session", {
      userId: "new-user",
      amount: 3,
      reason: "contribution",
    });
    expect(result.content[0].text).toContain("Awarded 3");
    expect(result.content[0].text).toContain("balance: 13"); // 10 initial + 3
  });
});
