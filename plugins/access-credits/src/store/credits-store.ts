import type {
  UserAccount,
  Transaction,
  TransactionType,
  DeductResult,
  AddResult,
  CreditsStoreData,
} from "./types.js";

export interface RuntimeStore {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
}

export interface CreditsStore {
  getUser(userId: string): UserAccount | null;
  getOrCreateUser(userId: string, displayName?: string): UserAccount;
  hasEnoughCredits(userId: string, amount: number): boolean;
  /** Atomic check-and-deduct. Prevents race conditions. */
  deductIfSufficient(userId: string, amount: number, reason: string): DeductResult;
  deductCredits(userId: string, amount: number, reason: string): DeductResult;
  addCredits(userId: string, amount: number, reason: string, type: TransactionType): AddResult;
  getTransactions(userId: string, limit?: number): Transaction[];
  getAllUsers(): UserAccount[];
  getStats(): { totalUsers: number; totalCreditsInCirculation: number; totalTransactions: number };
  isOnCooldown(userId: string, cooldownSeconds: number): boolean;
  recordInteraction(userId: string): void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// In-memory cooldown tracker (timestamps don't need persistence)
const lastInteraction = new Map<string, number>();

export function createCreditsStore(
  runtimeStore: RuntimeStore,
  getInitialCredits: number | (() => number),
): CreditsStore {
  const resolveInitialCredits = typeof getInitialCredits === "function"
    ? getInitialCredits
    : () => getInitialCredits;
  function getData(): CreditsStoreData {
    const raw = runtimeStore.get("credits-data") as CreditsStoreData | undefined;
    return raw ?? { users: {}, transactions: [] };
  }

  function saveData(data: CreditsStoreData): void {
    runtimeStore.set("credits-data", data);
  }

  return {
    getUser(userId: string): UserAccount | null {
      const data = getData();
      return data.users[userId] ?? null;
    },

    getOrCreateUser(userId: string, displayName?: string): UserAccount {
      const data = getData();
      if (data.users[userId]) {
        return data.users[userId];
      }

      const now = new Date().toISOString();
      const credits = resolveInitialCredits();
      const user: UserAccount = {
        userId,
        displayName,
        credits,
        totalEarned: credits,
        totalSpent: 0,
        lastActivity: now,
        createdAt: now,
      };

      data.users[userId] = user;

      const tx: Transaction = {
        id: generateId(),
        userId,
        type: "initial",
        amount: credits,
        balance: credits,
        reason: "Initial credits on first interaction",
        timestamp: now,
      };
      data.transactions.push(tx);

      saveData(data);
      return user;
    },

    hasEnoughCredits(userId: string, amount: number): boolean {
      const user = this.getUser(userId);
      if (!user) return resolveInitialCredits() >= amount;
      return user.credits >= amount;
    },

    deductIfSufficient(userId: string, amount: number, reason: string): DeductResult {
      const data = getData();
      let user = data.users[userId];

      if (!user) {
        this.getOrCreateUser(userId);
        const freshData = getData();
        user = freshData.users[userId];
        if (!user) return { success: false, balance: 0 };
        // Re-read to work on fresh data after create
        return this.deductIfSufficient(userId, amount, reason);
      }

      // Atomic: check + deduct in single read-modify-write
      if (user.credits < amount) {
        return { success: false, balance: user.credits };
      }

      user.credits -= amount;
      user.totalSpent += amount;
      user.lastActivity = new Date().toISOString();

      const tx: Transaction = {
        id: generateId(),
        userId,
        type: "debit",
        amount,
        balance: user.credits,
        reason,
        timestamp: user.lastActivity,
      };
      data.transactions.push(tx);

      saveData(data);
      return { success: true, balance: user.credits, transaction: tx };
    },

    deductCredits(userId: string, amount: number, reason: string): DeductResult {
      return this.deductIfSufficient(userId, amount, reason);
    },

    addCredits(
      userId: string,
      amount: number,
      reason: string,
      type: TransactionType,
    ): AddResult {
      this.getOrCreateUser(userId);
      const data = getData();
      const user = data.users[userId];

      const previousCredits = user.credits;
      user.credits += amount;
      // Floor at zero to prevent negative balances
      if (user.credits < 0) user.credits = 0;
      // Compute actual delta for consistent accounting
      const actualDelta = user.credits - previousCredits;
      if (actualDelta >= 0) {
        user.totalEarned += actualDelta;
      } else {
        user.totalSpent += Math.abs(actualDelta);
      }
      user.lastActivity = new Date().toISOString();

      const tx: Transaction = {
        id: generateId(),
        userId,
        type,
        amount: actualDelta,
        balance: user.credits,
        reason,
        timestamp: user.lastActivity,
      };
      data.transactions.push(tx);

      saveData(data);
      return { success: true, balance: user.credits, transaction: tx };
    },

    getTransactions(userId: string, limit = 50): Transaction[] {
      const data = getData();
      return data.transactions
        .filter((tx) => tx.userId === userId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit);
    },

    getAllUsers(): UserAccount[] {
      const data = getData();
      return Object.values(data.users);
    },

    getStats() {
      const data = getData();
      const users = Object.values(data.users);
      return {
        totalUsers: users.length,
        totalCreditsInCirculation: users.reduce((sum, u) => sum + u.credits, 0),
        totalTransactions: data.transactions.length,
      };
    },

    isOnCooldown(userId: string, cooldownSeconds: number): boolean {
      if (cooldownSeconds <= 0) return false;
      const last = lastInteraction.get(userId);
      if (!last) return false;
      return (Date.now() - last) < cooldownSeconds * 1000;
    },

    recordInteraction(userId: string): void {
      lastInteraction.set(userId, Date.now());
    },
  };
}
