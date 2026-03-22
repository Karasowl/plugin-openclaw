import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";

interface ToolCallEvent {
  type: string;
  action: string;
  sessionKey: string;
  context: {
    senderId?: string;
    from?: string;
    toolName?: string;
    block?: (errorMessage: string) => void;
  };
}

// Tools that the access-credits plugin itself registers (these should always be allowed)
const SELF_TOOLS = new Set([
  "access_credits_check_balance",
  "access_credits_deduct",
  "access_credits_award",
]);

/**
 * HARD GATE - Layer 2
 * Block ALL tool calls if the user has no credits.
 * This prevents the agent from doing anything useful when the user shouldn't have access.
 * Exception: our own credit management tools are always allowed.
 */
export function createToolGateHandler(
  store: CreditsStore,
  config: AccessCreditsConfig,
) {
  return (event: ToolCallEvent): void => {
    const toolName = event.context.toolName;
    if (toolName && SELF_TOOLS.has(toolName)) return;

    const senderId = event.context.senderId ?? event.context.from;
    if (!senderId) return;

    if (config.adminUsers.includes(senderId)) return;

    if (store.hasEnoughCredits(senderId, config.costPerMessage)) return;

    if (event.context.block) {
      event.context.block(
        "Access denied: user does not have enough credits to use tools.",
      );
    }
  };
}
