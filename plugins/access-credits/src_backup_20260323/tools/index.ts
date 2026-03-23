import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { createCheckBalanceTool } from "./check-balance.js";
import { createAwardCreditsTool } from "./award-credits.js";

export function registerCreditTools(
  api: Pick<OpenClawPluginApi, "registerTool">,
  store: CreditsStore,
  _getConfig: () => AccessCreditsConfig,
): void {
  api.registerTool(createCheckBalanceTool(store));
  // Note: deduct tool intentionally NOT registered.
  // Deduction is handled automatically by message-sending-gate
  // to prevent double-charging if the model also called the tool.
  api.registerTool(createAwardCreditsTool(store));
}
