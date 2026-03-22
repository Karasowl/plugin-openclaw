import type { RuntimeStore } from "./store/credits-store.js";
import type { AccessCreditsConfig } from "./config.js";

const CONFIG_KEY = "ac:config";

const KNOWN_KEYS = new Set<keyof AccessCreditsConfig>([
  "mode",
  "initialCredits",
  "costPerMessage",
  "triggerHashtags",
  "triggerCommands",
  "adminUsers",
  "fallbackModel",
  "evaluateContributions",
  "contributionReward",
  "contributionMinLength",
  "cooldownSeconds",
]);

const NON_NEGATIVE_NUMBERS = new Set<keyof AccessCreditsConfig>([
  "initialCredits",
  "costPerMessage",
  "contributionReward",
  "contributionMinLength",
  "cooldownSeconds",
]);

const STRING_ARRAYS = new Set<keyof AccessCreditsConfig>([
  "triggerHashtags",
  "triggerCommands",
  "adminUsers",
]);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: Partial<AccessCreditsConfig>;
}

export function validateConfigPatch(patch: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<AccessCreditsConfig> = {};

  for (const key of Object.keys(patch)) {
    if (!KNOWN_KEYS.has(key as keyof AccessCreditsConfig)) {
      errors.push(`Unknown config key: "${key}"`);
      continue;
    }

    const value = patch[key];
    const k = key as keyof AccessCreditsConfig;

    if (k === "mode") {
      if (value !== "observe" && value !== "enforce") {
        errors.push(`mode must be "observe" or "enforce", got "${String(value)}"`);
      } else {
        sanitized.mode = value;
      }
    } else if (NON_NEGATIVE_NUMBERS.has(k)) {
      if (typeof value !== "number" || !isFinite(value) || value < 0) {
        errors.push(`${key} must be a non-negative number, got ${JSON.stringify(value)}`);
      } else {
        (sanitized as Record<string, unknown>)[key] = value;
      }
    } else if (STRING_ARRAYS.has(k)) {
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
        errors.push(`${key} must be an array of strings`);
      } else {
        (sanitized as Record<string, unknown>)[key] = value;
      }
    } else if (k === "fallbackModel") {
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(`fallbackModel must be a non-empty string`);
      } else {
        sanitized.fallbackModel = value;
      }
    } else if (k === "evaluateContributions") {
      if (typeof value !== "boolean") {
        errors.push(`evaluateContributions must be a boolean, got ${typeof value}`);
      } else {
        sanitized.evaluateContributions = value;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

export function loadConfigOverrides(runtimeStore: RuntimeStore): Partial<AccessCreditsConfig> {
  const raw = runtimeStore.get(CONFIG_KEY);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Partial<AccessCreditsConfig>;
  }
  return {};
}

export function saveConfigOverrides(
  runtimeStore: RuntimeStore,
  overrides: Partial<AccessCreditsConfig>,
): void {
  runtimeStore.set(CONFIG_KEY, overrides);
}
