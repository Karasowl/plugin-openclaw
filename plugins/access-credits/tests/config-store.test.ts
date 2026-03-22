import { describe, it, expect } from "vitest";
import {
  validateConfigPatch,
  loadConfigOverrides,
  saveConfigOverrides,
} from "../src/config-store.js";
import { resolveConfig, DEFAULT_CONFIG } from "../src/config.js";

function createMockRuntimeStore() {
  const data: Record<string, unknown> = {};
  return {
    get: (key: string) => data[key],
    set: (key: string, value: unknown) => {
      data[key] = value;
    },
  };
}

describe("validateConfigPatch", () => {
  it("accepts valid partial config", () => {
    const result = validateConfigPatch({ mode: "observe", costPerMessage: 2 });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitized).toEqual({ mode: "observe", costPerMessage: 2 });
  });

  it("rejects unknown keys", () => {
    const result = validateConfigPatch({ unknownField: true });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unknown config key");
  });

  it("rejects invalid mode", () => {
    const result = validateConfigPatch({ mode: "turbo" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("observe");
  });

  it("rejects negative numbers", () => {
    const result = validateConfigPatch({ costPerMessage: -5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("non-negative");
  });

  it("rejects non-number for numeric fields", () => {
    const result = validateConfigPatch({ initialCredits: "ten" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("non-negative number");
  });

  it("rejects NaN and Infinity", () => {
    const r1 = validateConfigPatch({ costPerMessage: NaN });
    expect(r1.valid).toBe(false);
    const r2 = validateConfigPatch({ costPerMessage: Infinity });
    expect(r2.valid).toBe(false);
  });

  it("rejects non-array for array fields", () => {
    const result = validateConfigPatch({ triggerHashtags: "not-array" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("array of strings");
  });

  it("rejects array with non-string items", () => {
    const result = validateConfigPatch({ adminUsers: [1, 2, 3] });
    expect(result.valid).toBe(false);
  });

  it("accepts valid string arrays", () => {
    const result = validateConfigPatch({ triggerHashtags: ["#ask", "#help"] });
    expect(result.valid).toBe(true);
    expect(result.sanitized.triggerHashtags).toEqual(["#ask", "#help"]);
  });

  it("rejects empty fallbackModel", () => {
    const result = validateConfigPatch({ fallbackModel: "" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("non-empty string");
  });

  it("rejects non-boolean evaluateContributions", () => {
    const result = validateConfigPatch({ evaluateContributions: "yes" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("boolean");
  });

  it("collects multiple errors", () => {
    const result = validateConfigPatch({
      mode: "bad",
      costPerMessage: -1,
      unknownKey: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
  });

  it("returns empty sanitized on all errors", () => {
    const result = validateConfigPatch({ mode: "invalid" });
    expect(result.sanitized).toEqual({});
  });
});

describe("loadConfigOverrides / saveConfigOverrides", () => {
  it("returns empty object when no overrides saved", () => {
    const store = createMockRuntimeStore();
    expect(loadConfigOverrides(store)).toEqual({});
  });

  it("saves and loads overrides", () => {
    const store = createMockRuntimeStore();
    saveConfigOverrides(store, { mode: "observe", costPerMessage: 5 });
    const loaded = loadConfigOverrides(store);
    expect(loaded.mode).toBe("observe");
    expect(loaded.costPerMessage).toBe(5);
  });

  it("ignores non-object values in store", () => {
    const store = createMockRuntimeStore();
    store.set("ac:config", "not-an-object");
    expect(loadConfigOverrides(store)).toEqual({});
  });

  it("ignores array values in store", () => {
    const store = createMockRuntimeStore();
    store.set("ac:config", [1, 2, 3]);
    expect(loadConfigOverrides(store)).toEqual({});
  });
});

describe("resolveConfig with overrides", () => {
  it("overrides take priority over raw config", () => {
    const raw = { mode: "enforce", costPerMessage: 1 };
    const overrides = { mode: "observe" as const };
    const config = resolveConfig(raw, overrides);
    expect(config.mode).toBe("observe");
    expect(config.costPerMessage).toBe(1);
  });

  it("raw takes priority over defaults", () => {
    const raw = { initialCredits: 50 };
    const config = resolveConfig(raw);
    expect(config.initialCredits).toBe(50);
    expect(config.costPerMessage).toBe(DEFAULT_CONFIG.costPerMessage);
  });

  it("defaults fill in missing values", () => {
    const config = resolveConfig({}, {});
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("full override chain works", () => {
    const raw = { costPerMessage: 2, initialCredits: 20 };
    const overrides = { costPerMessage: 5 } as Partial<typeof DEFAULT_CONFIG>;
    const config = resolveConfig(raw, overrides);
    expect(config.costPerMessage).toBe(5);    // override wins
    expect(config.initialCredits).toBe(20);   // raw wins
    expect(config.mode).toBe("enforce");      // default wins
  });
});
