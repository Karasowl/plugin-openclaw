export type ContributionMode = "always" | "groups-only" | "admin-only" | "off";
export type AccessContextKind = "group" | "direct";

export interface ContextConfig {
  enabled: boolean;
  costPerMessage: number;
  evaluateContributions: ContributionMode;
  cooldownSeconds: number;
}

export interface ModelOption {
  label: string;
  model: string;
  costPerMessage: number;
}

export interface DirectMessageConfig extends ContextConfig {
  allowModelChoice: boolean;
  models: Record<string, ModelOption>;
  defaultModel: string;
}

export interface AccessCreditsConfig {
  mode: "observe" | "enforce";
  initialCredits: number;
  triggerHashtags: string[];
  triggerCommands: string[];
  adminUsers: string[];
  agentIds: string[];
  fallbackModel: string;
  contributionReward: number;
  contributionMinLength: number;
  groups: ContextConfig;
  directMessages: DirectMessageConfig;
}

export interface ContextConfigPatch {
  enabled?: boolean;
  costPerMessage?: number;
  evaluateContributions?: ContributionMode;
  cooldownSeconds?: number;
}

export interface ModelOptionPatch {
  label?: string;
  model?: string;
  costPerMessage?: number;
}

export interface DirectMessageConfigPatch extends ContextConfigPatch {
  allowModelChoice?: boolean;
  models?: Record<string, ModelOptionPatch>;
  defaultModel?: string;
}

export interface AccessCreditsConfigPatch {
  mode?: AccessCreditsConfig["mode"];
  initialCredits?: number;
  triggerHashtags?: string[];
  triggerCommands?: string[];
  adminUsers?: string[];
  agentIds?: string[];
  fallbackModel?: string;
  contributionReward?: number;
  contributionMinLength?: number;
  groups?: ContextConfigPatch;
  directMessages?: DirectMessageConfigPatch;
}

export interface UserConfigPreferences {
  selectedModel?: string;
}

export interface ResolvedDirectMessageModel {
  alias: string;
  option: ModelOption;
}

type ResolveConfigOptions = {
  warn?: (message: string) => void;
};

type LegacyFlatConfig = {
  costPerMessage?: number;
  evaluateContributions?: boolean;
  cooldownSeconds?: number;
  chatTypes?: string[];
};

const DEFAULT_DM_MODELS: Record<string, ModelOption> = {
  sonnet: {
    label: "Claude Sonnet",
    model: "anthropic/claude-sonnet-4-5",
    costPerMessage: 1,
  },
  opus: {
    label: "Claude Opus",
    model: "anthropic/claude-opus-4-6",
    costPerMessage: 3,
  },
};

export const DEFAULT_CONFIG: AccessCreditsConfig = {
  mode: "enforce",
  initialCredits: 10,
  triggerHashtags: ["#ask", "#bot"],
  triggerCommands: ["/ask", "/bot"],
  adminUsers: [],
  agentIds: [],
  fallbackModel: "cheapest",
  contributionReward: 2,
  contributionMinLength: 100,
  groups: {
    enabled: true,
    costPerMessage: 1,
    evaluateContributions: "always",
    cooldownSeconds: 0,
  },
  directMessages: {
    enabled: true,
    costPerMessage: 1,
    evaluateContributions: "admin-only",
    cooldownSeconds: 0,
    allowModelChoice: false,
    models: cloneModels(DEFAULT_DM_MODELS),
    defaultModel: "sonnet",
  },
};

let legacyConfigWarningShown = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneModels(models: Record<string, ModelOption>): Record<string, ModelOption> {
  const next: Record<string, ModelOption> = {};
  for (const [alias, option] of Object.entries(models)) {
    next[alias] = { ...option };
  }
  return next;
}

/** Coerce a value to string[]. Handles strings (comma-separated), arrays, and fallback. */
function toStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [...fallback];
}

function toNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toMode(value: unknown, fallback: AccessCreditsConfig["mode"]): AccessCreditsConfig["mode"] {
  return value === "observe" || value === "enforce" ? value : fallback;
}

function toContributionMode(value: unknown, fallback: ContributionMode): ContributionMode {
  return value === "always" || value === "groups-only" || value === "admin-only" || value === "off"
    ? value
    : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function mergeModels(
  base: Record<string, ModelOption>,
  patch: Record<string, ModelOptionPatch> | Record<string, ModelOption> | undefined,
): Record<string, ModelOption> {
  if (!patch) return cloneModels(base);

  const next = cloneModels(base);
  for (const [alias, rawOption] of Object.entries(patch)) {
    if (!isRecord(rawOption)) continue;
    const previous = next[alias] ?? DEFAULT_DM_MODELS[alias] ?? {
      label: alias,
      model: "",
      costPerMessage: DEFAULT_CONFIG.directMessages.costPerMessage,
    };
    next[alias] = {
      label: toNonEmptyString(rawOption.label, previous.label),
      model: toNonEmptyString(rawOption.model, previous.model),
      costPerMessage: toNonNegativeNumber(rawOption.costPerMessage, previous.costPerMessage),
    };
  }
  return next;
}

function normalizeDirectMessageModels(
  rawModels: unknown,
  overrideModels: DirectMessageConfigPatch["models"] | undefined,
): Record<string, ModelOption> {
  const baseModels = mergeModels(DEFAULT_CONFIG.directMessages.models, isRecord(rawModels)
    ? rawModels as Record<string, ModelOptionPatch>
    : undefined);
  return mergeModels(baseModels, overrideModels);
}

function resolveDefaultModelAlias(
  preferredAlias: unknown,
  models: Record<string, ModelOption>,
  fallbackAlias: string,
): string {
  if (typeof preferredAlias === "string" && preferredAlias in models) return preferredAlias;
  if (fallbackAlias in models) return fallbackAlias;
  const firstAlias = Object.keys(models)[0];
  return firstAlias ?? fallbackAlias;
}

function resolveLegacyFlatConfig(
  raw: Record<string, unknown>,
  overrides: AccessCreditsConfigPatch,
): LegacyFlatConfig {
  const rawChatTypes = toStringArray(raw.chatTypes, []);
  const overrideChatTypes = toStringArray((overrides as Record<string, unknown>).chatTypes, rawChatTypes);

  return {
    costPerMessage: toOptionalLegacyNumber(overrides, "costPerMessage") ?? toOptionalLegacyNumber(raw, "costPerMessage"),
    evaluateContributions: toOptionalLegacyBoolean(overrides, "evaluateContributions")
      ?? toOptionalLegacyBoolean(raw, "evaluateContributions"),
    cooldownSeconds: toOptionalLegacyNumber(overrides, "cooldownSeconds") ?? toOptionalLegacyNumber(raw, "cooldownSeconds"),
    chatTypes: overrideChatTypes,
  };
}

function toOptionalLegacyNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function toOptionalLegacyBoolean(source: Record<string, unknown>, key: string): boolean | undefined {
  const value = source[key];
  return typeof value === "boolean" ? value : undefined;
}

function resolveLegacyContributionMode(value: boolean | undefined): ContributionMode | undefined {
  if (value === true) return "groups-only";
  if (value === false) return "off";
  return undefined;
}

function resolveLegacyEnabled(chatTypes: string[] | undefined, kind: AccessContextKind, fallback: boolean): boolean {
  if (!chatTypes || chatTypes.length === 0) return fallback;
  if (kind === "group") return chatTypes.includes("group");
  return chatTypes.includes("direct") || chatTypes.includes("dm");
}

function resolveContextConfig(
  rawContext: Record<string, unknown> | undefined,
  overrideContext: ContextConfigPatch | undefined,
  defaults: ContextConfig,
  legacy: LegacyFlatConfig,
  kind: AccessContextKind,
): ContextConfig {
  const legacyContributionMode = resolveLegacyContributionMode(legacy.evaluateContributions);

  return {
    enabled: toBoolean(
      overrideContext?.enabled ?? rawContext?.enabled,
      resolveLegacyEnabled(legacy.chatTypes, kind, defaults.enabled),
    ),
    costPerMessage: toNonNegativeNumber(
      overrideContext?.costPerMessage ?? rawContext?.costPerMessage,
      legacy.costPerMessage ?? defaults.costPerMessage,
    ),
    evaluateContributions: toContributionMode(
      overrideContext?.evaluateContributions ?? rawContext?.evaluateContributions,
      legacyContributionMode ?? defaults.evaluateContributions,
    ),
    cooldownSeconds: toNonNegativeNumber(
      overrideContext?.cooldownSeconds ?? rawContext?.cooldownSeconds,
      legacy.cooldownSeconds ?? defaults.cooldownSeconds,
    ),
  };
}

function hasLegacyFlatKeys(raw: Record<string, unknown>, overrides: AccessCreditsConfigPatch): boolean {
  const keys = ["costPerMessage", "evaluateContributions", "cooldownSeconds", "chatTypes"];
  return keys.some((key) => key in raw || key in (overrides as Record<string, unknown>));
}

function warnOnLegacyFlatConfig(
  raw: Record<string, unknown>,
  overrides: AccessCreditsConfigPatch,
  options: ResolveConfigOptions | undefined,
): void {
  if (!hasLegacyFlatKeys(raw, overrides) || legacyConfigWarningShown) return;
  legacyConfigWarningShown = true;
  options?.warn?.(
    "[access-credits] Deprecated flat config detected. " +
    "Move costPerMessage/evaluateContributions/cooldownSeconds/chatTypes into groups/directMessages.",
  );
}

export function mergeConfigOverrides(
  existing: AccessCreditsConfigPatch,
  patch: AccessCreditsConfigPatch,
): AccessCreditsConfigPatch {
  return {
    ...existing,
    ...patch,
    groups: patch.groups ? { ...existing.groups, ...patch.groups } : existing.groups,
    directMessages: patch.directMessages
      ? {
        ...existing.directMessages,
        ...patch.directMessages,
        models: patch.directMessages.models
          ? {
            ...(existing.directMessages?.models ?? {}),
            ...patch.directMessages.models,
          }
          : existing.directMessages?.models,
      }
      : existing.directMessages,
  };
}

export function resolveConfig(
  raw: Record<string, unknown>,
  overrides: AccessCreditsConfigPatch = {},
  options?: ResolveConfigOptions,
): AccessCreditsConfig {
  warnOnLegacyFlatConfig(raw, overrides, options);

  const legacy = resolveLegacyFlatConfig(raw, overrides);
  const rawGroups = isRecord(raw.groups) ? raw.groups : undefined;
  const rawDirectMessages = isRecord(raw.directMessages) ? raw.directMessages : undefined;

  const groups = resolveContextConfig(rawGroups, overrides.groups, DEFAULT_CONFIG.groups, legacy, "group");
  const directBase = resolveContextConfig(
    rawDirectMessages,
    overrides.directMessages,
    DEFAULT_CONFIG.directMessages,
    legacy,
    "direct",
  );
  const models = normalizeDirectMessageModels(rawDirectMessages?.models, overrides.directMessages?.models);
  const defaultModel = resolveDefaultModelAlias(
    overrides.directMessages?.defaultModel ?? rawDirectMessages?.defaultModel,
    models,
    DEFAULT_CONFIG.directMessages.defaultModel,
  );

  return {
    mode: toMode(overrides.mode ?? raw.mode, DEFAULT_CONFIG.mode),
    initialCredits: toNonNegativeNumber(overrides.initialCredits ?? raw.initialCredits, DEFAULT_CONFIG.initialCredits),
    triggerHashtags: toStringArray(overrides.triggerHashtags ?? raw.triggerHashtags, DEFAULT_CONFIG.triggerHashtags),
    triggerCommands: toStringArray(overrides.triggerCommands ?? raw.triggerCommands, DEFAULT_CONFIG.triggerCommands),
    adminUsers: toStringArray(overrides.adminUsers ?? raw.adminUsers, DEFAULT_CONFIG.adminUsers),
    agentIds: toStringArray(overrides.agentIds ?? raw.agentIds, DEFAULT_CONFIG.agentIds),
    fallbackModel: toNonEmptyString(overrides.fallbackModel ?? raw.fallbackModel, DEFAULT_CONFIG.fallbackModel),
    contributionReward: toNonNegativeNumber(
      overrides.contributionReward ?? raw.contributionReward,
      DEFAULT_CONFIG.contributionReward,
    ),
    contributionMinLength: toNonNegativeNumber(
      overrides.contributionMinLength ?? raw.contributionMinLength,
      DEFAULT_CONFIG.contributionMinLength,
    ),
    groups,
    directMessages: {
      ...directBase,
      allowModelChoice: toBoolean(
        overrides.directMessages?.allowModelChoice ?? rawDirectMessages?.allowModelChoice,
        DEFAULT_CONFIG.directMessages.allowModelChoice,
      ),
      models,
      defaultModel,
    },
  };
}

export function getContextConfig(config: AccessCreditsConfig, kind: AccessContextKind): ContextConfig | DirectMessageConfig {
  return kind === "group" ? config.groups : config.directMessages;
}

export function resolveDirectMessageModel(
  config: AccessCreditsConfig,
  preferences?: UserConfigPreferences | null,
): ResolvedDirectMessageModel | null {
  const models = config.directMessages.models;
  const preferredAlias = preferences?.selectedModel;
  const alias = resolveDefaultModelAlias(preferredAlias, models, config.directMessages.defaultModel);
  if (!(alias in models)) return null;
  return { alias, option: models[alias] };
}

export function resolveInteractionCost(
  config: AccessCreditsConfig,
  kind: AccessContextKind,
  preferences?: UserConfigPreferences | null,
): number {
  if (kind === "direct" && config.directMessages.allowModelChoice) {
    const selected = resolveDirectMessageModel(config, preferences);
    if (selected) return selected.option.costPerMessage;
  }
  return getContextConfig(config, kind).costPerMessage;
}

export function shouldEvaluateContributions(mode: ContributionMode, kind: AccessContextKind): boolean {
  if (mode === "always") return true;
  if (mode === "groups-only") return kind === "group";
  return false;
}
