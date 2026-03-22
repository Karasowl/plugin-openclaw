export interface AccessCreditsConfig {
  mode: "observe" | "enforce";
  initialCredits: number;
  costPerMessage: number;
  triggerHashtags: string[];
  triggerCommands: string[];
  adminUsers: string[];
  fallbackModel: string;
  evaluateContributions: boolean;
  contributionReward: number;
  contributionMinLength: number;
  cooldownSeconds: number;
}

export const DEFAULT_CONFIG: AccessCreditsConfig = {
  mode: "enforce",
  initialCredits: 10,
  costPerMessage: 1,
  triggerHashtags: ["#ask", "#bot"],
  triggerCommands: ["/ask", "/bot"],
  adminUsers: [],
  fallbackModel: "cheapest",
  evaluateContributions: true,
  contributionReward: 2,
  contributionMinLength: 100,
  cooldownSeconds: 0,
};

export function resolveConfig(raw: Record<string, unknown>): AccessCreditsConfig {
  return {
    mode: (raw.mode as AccessCreditsConfig["mode"]) ?? DEFAULT_CONFIG.mode,
    initialCredits: (raw.initialCredits as number) ?? DEFAULT_CONFIG.initialCredits,
    costPerMessage: (raw.costPerMessage as number) ?? DEFAULT_CONFIG.costPerMessage,
    triggerHashtags: (raw.triggerHashtags as string[]) ?? DEFAULT_CONFIG.triggerHashtags,
    triggerCommands: (raw.triggerCommands as string[]) ?? DEFAULT_CONFIG.triggerCommands,
    adminUsers: (raw.adminUsers as string[]) ?? DEFAULT_CONFIG.adminUsers,
    fallbackModel: (raw.fallbackModel as string) ?? DEFAULT_CONFIG.fallbackModel,
    evaluateContributions: (raw.evaluateContributions as boolean) ?? DEFAULT_CONFIG.evaluateContributions,
    contributionReward: (raw.contributionReward as number) ?? DEFAULT_CONFIG.contributionReward,
    contributionMinLength: (raw.contributionMinLength as number) ?? DEFAULT_CONFIG.contributionMinLength,
    cooldownSeconds: (raw.cooldownSeconds as number) ?? DEFAULT_CONFIG.cooldownSeconds,
  };
}
