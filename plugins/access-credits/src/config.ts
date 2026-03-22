export interface AccessCreditsConfig {
  mode: "observe" | "enforce";
  initialCredits: number;
  costPerMessage: number;
  triggerHashtags: string[];
  triggerCommands: string[];
  adminUsers: string[];
  agentIds: string[];
  chatTypes: string[];
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
  agentIds: [],
  chatTypes: [],
  fallbackModel: "cheapest",
  evaluateContributions: true,
  contributionReward: 2,
  contributionMinLength: 100,
  cooldownSeconds: 0,
};

/** Coerce a value to string[]. Handles strings (comma-separated), arrays, and fallback. */
function toStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return fallback;
}

export function resolveConfig(
  raw: Record<string, unknown>,
  overrides: Partial<AccessCreditsConfig> = {},
): AccessCreditsConfig {
  return {
    mode: overrides.mode ?? (raw.mode as AccessCreditsConfig["mode"]) ?? DEFAULT_CONFIG.mode,
    initialCredits: overrides.initialCredits ?? (raw.initialCredits as number) ?? DEFAULT_CONFIG.initialCredits,
    costPerMessage: overrides.costPerMessage ?? (raw.costPerMessage as number) ?? DEFAULT_CONFIG.costPerMessage,
    triggerHashtags: toStringArray(overrides.triggerHashtags ?? raw.triggerHashtags, DEFAULT_CONFIG.triggerHashtags),
    triggerCommands: toStringArray(overrides.triggerCommands ?? raw.triggerCommands, DEFAULT_CONFIG.triggerCommands),
    adminUsers: toStringArray(overrides.adminUsers ?? raw.adminUsers, DEFAULT_CONFIG.adminUsers),
    agentIds: toStringArray(overrides.agentIds ?? raw.agentIds, DEFAULT_CONFIG.agentIds),
    chatTypes: toStringArray(overrides.chatTypes ?? raw.chatTypes, DEFAULT_CONFIG.chatTypes),
    fallbackModel: overrides.fallbackModel ?? (raw.fallbackModel as string) ?? DEFAULT_CONFIG.fallbackModel,
    evaluateContributions: overrides.evaluateContributions ?? (raw.evaluateContributions as boolean) ?? DEFAULT_CONFIG.evaluateContributions,
    contributionReward: overrides.contributionReward ?? (raw.contributionReward as number) ?? DEFAULT_CONFIG.contributionReward,
    contributionMinLength: overrides.contributionMinLength ?? (raw.contributionMinLength as number) ?? DEFAULT_CONFIG.contributionMinLength,
    cooldownSeconds: overrides.cooldownSeconds ?? (raw.cooldownSeconds as number) ?? DEFAULT_CONFIG.cooldownSeconds,
  };
}
