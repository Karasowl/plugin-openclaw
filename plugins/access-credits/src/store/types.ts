export interface UserAccount {
  userId: string;
  displayName?: string;
  credits: number;
  totalEarned: number;
  totalSpent: number;
  lastActivity: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balance: number;
  reason: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type TransactionType =
  | "debit"
  | "credit"
  | "admin_add"
  | "admin_remove"
  | "contribution_reward"
  | "initial";

export interface DeductResult {
  success: boolean;
  balance: number;
  transaction?: Transaction;
}

export interface AddResult {
  success: boolean;
  balance: number;
  transaction: Transaction;
}

export interface CreditsStoreData {
  users: Record<string, UserAccount>;
  transactions: Transaction[];
}
