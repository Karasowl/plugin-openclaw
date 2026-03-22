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

// --- New types for dashboard v2 ---

export interface SystemPrompt {
  id: string;
  name: string;
  type: "pre_interaction" | "post_interaction";
  content: string;
  modelContext: string;
  temperature: number;
  version: number;
  isActive: boolean;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  version: number;
  content: string;
  deployedAt: string | null;
  createdAt: string;
}

export interface GroupInfo {
  chatId: string;
  chatTitle: string;
  memberCount: number;
  status: "active" | "paused";
  lastActivity: string;
}

export interface SystemEvent {
  id: string;
  type: "user_joined" | "credits_added" | "credits_deducted" | "config_changed" | "prompt_deployed" | "group_detected" | "contribution_rewarded";
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MessagingConfig {
  locale: string;
  autoDetect: boolean;
  templates: Record<string, string>;
  regions: Array<{ name: string; locale: string; active: boolean }>;
}
