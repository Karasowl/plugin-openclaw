import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { createCheckBalanceTool } from "./check-balance.js";
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
  // Note: deduct tool intentionally NOT registered.
  // Deduction is handled automatically by message-sending-gate
  // to prevent double-charging if the model also called the tool.
  api.registerTool(createAwardCreditsTool(store));
}
