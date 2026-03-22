import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { createCheckBalanceTool } from "./check-balance.js";
import { createDeductCreditsTool } from "./deduct-credits.js";
import { createAwardCreditsTool } from "./award-credits.js";

interface PluginApi {
  registerTool(tool: unknown): void;
}

export function registerCreditTools(
  api: PluginApi,
  store: CreditsStore,
  _getConfig: () => AccessCreditsConfig,
): void {
  api.registerTool(createCheckBalanceTool(store));
  api.registerTool(createDeductCreditsTool(store));
  api.registerTool(createAwardCreditsTool(store));
}
