import { describe, it, expect, beforeEach } from "vitest";
import { createCreditsStore, type CreditsStore } from "../src/store/credits-store.js";

function createMockRuntimeStore() {
  const data: Record<string, unknown> = {};
  return {
    get: (key: string) => data[key],
    set: (key: string, value: unknown) => {
      data[key] = value;
    },
  };
}

describe("CreditsStore", () => {
  let store: CreditsStore;

  beforeEach(() => {
    store = createCreditsStore(createMockRuntimeStore(), 10);
  });

  describe("getOrCreateUser", () => {
    it("creates a new user with initial credits", () => {
      const user = store.getOrCreateUser("user-1", "Alice");
      expect(user.userId).toBe("user-1");
      expect(user.displayName).toBe("Alice");
      expect(user.credits).toBe(10);
      expect(user.totalEarned).toBe(10);
      expect(user.totalSpent).toBe(0);
    });

    it("returns existing user without modifying credits", () => {
      store.getOrCreateUser("user-1", "Alice");
      store.deductCredits("user-1", 3, "test");
      const user = store.getOrCreateUser("user-1", "Alice");
      expect(user.credits).toBe(7);
    });

    it("records an initial transaction", () => {
      store.getOrCreateUser("user-1");
      const txs = store.getTransactions("user-1");
      expect(txs).toHaveLength(1);
      expect(txs[0].type).toBe("initial");
      expect(txs[0].amount).toBe(10);
    });
  });

  describe("getUser", () => {
    it("returns null for non-existent user", () => {
      expect(store.getUser("nonexistent")).toBeNull();
    });

    it("returns existing user", () => {
      store.getOrCreateUser("user-1");
      const user = store.getUser("user-1");
      expect(user).not.toBeNull();
      expect(user!.userId).toBe("user-1");
    });
  });

  describe("hasEnoughCredits", () => {
    it("returns true when user has enough credits", () => {
      store.getOrCreateUser("user-1");
      expect(store.hasEnoughCredits("user-1", 5)).toBe(true);
    });

    it("returns false when user has insufficient credits", () => {
      store.getOrCreateUser("user-1");
      expect(store.hasEnoughCredits("user-1", 15)).toBe(false);
    });

    it("uses initialCredits for non-existent users", () => {
      expect(store.hasEnoughCredits("new-user", 10)).toBe(true);
      expect(store.hasEnoughCredits("new-user", 11)).toBe(false);
    });
  });

  describe("deductCredits", () => {
    it("deducts credits successfully", () => {
      store.getOrCreateUser("user-1");
      const result = store.deductCredits("user-1", 3, "bot interaction");
      expect(result.success).toBe(true);
      expect(result.balance).toBe(7);
      expect(result.transaction).toBeDefined();
      expect(result.transaction!.type).toBe("debit");
    });

    it("fails when insufficient credits", () => {
      store.getOrCreateUser("user-1");
      const result = store.deductCredits("user-1", 15, "too much");
      expect(result.success).toBe(false);
      expect(result.balance).toBe(10);
    });

    it("auto-creates non-existent user and deducts", () => {
      const result = store.deductCredits("ghost", 1, "test");
      expect(result.success).toBe(true);
      expect(result.balance).toBe(9); // 10 initial - 1
    });

    it("updates totalSpent", () => {
      store.getOrCreateUser("user-1");
      store.deductCredits("user-1", 3, "test");
      const user = store.getUser("user-1")!;
      expect(user.totalSpent).toBe(3);
    });
  });

  describe("addCredits", () => {
    it("adds credits to existing user", () => {
      store.getOrCreateUser("user-1");
      const result = store.addCredits("user-1", 5, "good contribution", "contribution_reward");
      expect(result.success).toBe(true);
      expect(result.balance).toBe(15);
    });

    it("creates user if not exists and adds credits", () => {
      const result = store.addCredits("new-user", 5, "admin grant", "admin_add");
      expect(result.success).toBe(true);
      expect(result.balance).toBe(15); // 10 initial + 5 added
    });

    it("records the correct transaction type", () => {
      store.getOrCreateUser("user-1");
      store.addCredits("user-1", 5, "reward", "contribution_reward");
      const txs = store.getTransactions("user-1");
      const rewardTx = txs.find((tx) => tx.type === "contribution_reward");
      expect(rewardTx).toBeDefined();
      expect(rewardTx!.amount).toBe(5);
    });
  });

  describe("getTransactions", () => {
    it("returns all transactions for a user", () => {
      store.getOrCreateUser("user-1");
      store.deductCredits("user-1", 1, "first");
      store.deductCredits("user-1", 1, "second");
      const txs = store.getTransactions("user-1");
      expect(txs.length).toBeGreaterThanOrEqual(3); // initial + 2 debits
      const reasons = txs.map((tx) => tx.reason);
      expect(reasons).toContain("first");
      expect(reasons).toContain("second");
    });

    it("respects limit parameter", () => {
      store.getOrCreateUser("user-1");
      store.deductCredits("user-1", 1, "a");
      store.deductCredits("user-1", 1, "b");
      const txs = store.getTransactions("user-1", 2);
      expect(txs).toHaveLength(2);
    });
  });

  describe("getAllUsers", () => {
    it("returns all registered users", () => {
      store.getOrCreateUser("user-1", "Alice");
      store.getOrCreateUser("user-2", "Bob");
      const users = store.getAllUsers();
      expect(users).toHaveLength(2);
    });
  });

  describe("getStats", () => {
    it("returns correct statistics", () => {
      store.getOrCreateUser("user-1");
      store.getOrCreateUser("user-2");
      store.deductCredits("user-1", 3, "test");
      const stats = store.getStats();
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalCreditsInCirculation).toBe(17); // 7 + 10
      expect(stats.totalTransactions).toBe(3); // 2 initial + 1 debit
    });
  });

  describe("deductIfSufficient", () => {
    it("atomically checks and deducts", () => {
      store.getOrCreateUser("user-1");
      const result = store.deductIfSufficient("user-1", 3, "atomic deduct");
      expect(result.success).toBe(true);
      expect(result.balance).toBe(7);
    });

    it("fails atomically when insufficient", () => {
      store.getOrCreateUser("user-1");
      const result = store.deductIfSufficient("user-1", 15, "too much");
      expect(result.success).toBe(false);
      expect(result.balance).toBe(10); // unchanged
    });

    it("creates user if not exists", () => {
      const result = store.deductIfSufficient("new-user", 3, "first deduct");
      expect(result.success).toBe(true);
      expect(result.balance).toBe(7); // 10 initial - 3
    });
  });

  describe("cooldown", () => {
    it("reports no cooldown when cooldownSeconds is 0", () => {
      expect(store.isOnCooldown("user-1", 0)).toBe(false);
    });

    it("reports no cooldown for unknown user", () => {
      expect(store.isOnCooldown("user-1", 60)).toBe(false);
    });

    it("reports cooldown after recording interaction", () => {
      store.recordInteraction("user-1");
      expect(store.isOnCooldown("user-1", 60)).toBe(true);
    });

    it("reports no cooldown after time passes", () => {
      store.recordInteraction("user-1");
      // With 0 seconds cooldown, should not be on cooldown
      expect(store.isOnCooldown("user-1", 0)).toBe(false);
    });
  });
});
