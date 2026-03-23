import type { RuntimeStore } from "./store/credits-store.js";
import type {
  AccessCreditsConfigPatch,
  ContextConfigPatch,
  DirectMessageConfigPatch,
  ModelOptionPatch,
  ContributionMode,
} from "./config.js";

const CONFIG_KEY = "ac:config";

const TOP_LEVEL_KEYS = new Set<keyof AccessCreditsConfigPatch>([
  "mode",
  "initialCredits",
  "triggerHashtags",
  "triggerCommands",
  "adminUsers",
  "agentIds",
  "fallbackModel",
  "contributionReward",
  "contributionMinLength",
  "groups",
  "directMessages",
]);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: AccessCreditsConfigPatch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isContributionMode(value: unknown): value is ContributionMode {
  return value === "always" || value === "groups-only" || value === "admin-only" || value === "off";
}

function validateStringArray(
  value: unknown,
  key: string,
  errors: string[],
): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    errors.push(`${key} must be an array of strings`);
    return undefined;
  }
  return value;
}

function validateNonNegativeNumber(
  value: unknown,
  key: string,
  errors: string[],
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(`${key} must be a non-negative number, got ${JSON.stringify(value)}`);
    return undefined;
  }
  return value;
}

function validateContextPatch(
  value: unknown,
  key: "groups" | "directMessages",
  errors: string[],
): ContextConfigPatch | DirectMessageConfigPatch | undefined {
  if (!isRecord(value)) {
    errors.push(`${key} must be an object`);
    return undefined;
  }

  const sanitized: ContextConfigPatch = {};
  const allowedKeys = new Set(["enabled", "costPerMessage", "evaluateContributions", "cooldownSeconds"]);
  if (key === "directMessages") {
    allowedKeys.add("allowModelChoice");
    allowedKeys.add("models");
    allowedKeys.add("defaultModel");
  }

  for (const nestedKey of Object.keys(value)) {
    if (!allowedKeys.has(nestedKey)) {
      errors.push(`Unknown config key: "${key}.${nestedKey}"`);
      continue;
    }

    const nestedValue = value[nestedKey];
    if (nestedKey === "enabled" || nestedKey === "allowModelChoice") {
      if (typeof nestedValue !== "boolean") {
        errors.push(`${key}.${nestedKey} must be a boolean`);
      } else {
        (sanitized as Record<string, unknown>)[nestedKey] = nestedValue;
      }
      continue;
    }

    if (nestedKey === "costPerMessage" || nestedKey === "cooldownSeconds") {
      const validated = validateNonNegativeNumber(nestedValue, `${key}.${nestedKey}`, errors);
      if (validated !== undefined) {
        (sanitized as Record<string, unknown>)[nestedKey] = validated;
      }
      continue;
    }

    if (nestedKey === "evaluateContributions") {
      if (!isContributionMode(nestedValue)) {
        errors.push(
          `${key}.evaluateContributions must be one of "always", "groups-only", "admin-only", "off"`,
        );
      } else {
        sanitized.evaluateContributions = nestedValue;
      }
      continue;
    }

    if (nestedKey === "defaultModel") {
      if (typeof nestedValue !== "string" || nestedValue.trim() === "") {
        errors.push(`${key}.defaultModel must be a non-empty string`);
      } else {
        (sanitized as DirectMessageConfigPatch).defaultModel = nestedValue.trim();
      }
      continue;
    }

    if (nestedKey === "models") {
      const models = validateModelsPatch(nestedValue, `${key}.models`, errors);
      if (models) {
        (sanitized as DirectMessageConfigPatch).models = models;
      }
    }
  }

  return sanitized as ContextConfigPatch | DirectMessageConfigPatch;
}

function validateModelsPatch(
  value: unknown,
  key: string,
  errors: string[],
): Record<string, ModelOptionPatch> | undefined {
  if (!isRecord(value)) {
    errors.push(`${key} must be an object`);
    return undefined;
  }

  const sanitized: Record<string, ModelOptionPatch> = {};
  for (const [alias, rawOption] of Object.entries(value)) {
    if (!alias.trim()) {
      errors.push(`${key} contains an empty model alias`);
      continue;
    }
    if (!isRecord(rawOption)) {
      errors.push(`${key}.${alias} must be an object`);
      continue;
    }

    const option: ModelOptionPatch = {};
    const allowedKeys = new Set(["label", "model", "costPerMessage"]);
    for (const nestedKey of Object.keys(rawOption)) {
      if (!allowedKeys.has(nestedKey)) {
        errors.push(`Unknown config key: "${key}.${alias}.${nestedKey}"`);
        continue;
      }
      const nestedValue = rawOption[nestedKey];
      if (nestedKey === "costPerMessage") {
        const validated = validateNonNegativeNumber(nestedValue, `${key}.${alias}.costPerMessage`, errors);
        if (validated !== undefined) option.costPerMessage = validated;
        continue;
      }
      if (typeof nestedValue !== "string" || nestedValue.trim() === "") {
        errors.push(`${key}.${alias}.${nestedKey} must be a non-empty string`);
        continue;
      }
      (option as Record<string, unknown>)[nestedKey] = nestedValue.trim();
    }

    sanitized[alias] = option;
  }

  return sanitized;
}

export function validateConfigPatch(patch: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const sanitized: AccessCreditsConfigPatch = {};

  for (const key of Object.keys(patch)) {
    if (!TOP_LEVEL_KEYS.has(key as keyof AccessCreditsConfigPatch)) {
      errors.push(`Unknown config key: "${key}"`);
      continue;
    }

    const value = patch[key];

    if (key === "mode") {
      if (value !== "observe" && value !== "enforce") {
        errors.push(`mode must be "observe" or "enforce", got "${String(value)}"`);
      } else {
        sanitized.mode = value;
      }
      continue;
    }

    if (key === "initialCredits" || key === "contributionReward" || key === "contributionMinLength") {
      const validated = validateNonNegativeNumber(value, key, errors);
      if (validated !== undefined) {
        (sanitized as Record<string, unknown>)[key] = validated;
      }
      continue;
    }

    if (key === "triggerHashtags" || key === "triggerCommands" || key === "adminUsers" || key === "agentIds") {
      const validated = validateStringArray(value, key, errors);
      if (validated) {
        (sanitized as Record<string, unknown>)[key] = validated;
      }
      continue;
    }

    if (key === "fallbackModel") {
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(`fallbackModel must be a non-empty string`);
      } else {
        sanitized.fallbackModel = value.trim();
      }
      continue;
    }

    if (key === "groups" || key === "directMessages") {
      const validated = validateContextPatch(value, key, errors);
      if (validated) {
        (sanitized as Record<string, unknown>)[key] = validated;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : {},
  };
}

export function loadConfigOverrides(runtimeStore: RuntimeStore): AccessCreditsConfigPatch {
  const raw = runtimeStore.get(CONFIG_KEY);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as AccessCreditsConfigPatch;
  }
  return {};
}

export function saveConfigOverrides(
  runtimeStore: RuntimeStore,
  overrides: AccessCreditsConfigPatch,
): void {
  runtimeStore.set(CONFIG_KEY, overrides);
}
