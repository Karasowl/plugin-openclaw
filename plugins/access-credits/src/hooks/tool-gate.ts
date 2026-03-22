import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionDenied, isSessionTriggered } from "../gate-state.js";

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

// Tools that the access-credits plugin itself registers (always allowed)
const SELF_TOOLS = new Set([
  "access_credits_check_balance",
  "access_credits_deduct",
  "access_credits_award",
]);

/**
 * HARD GATE - Layer 2
 * Block ALL tool calls if the session was triggered AND denied.
 * Only acts on gated messages, not normal group chat.
 */
export function createToolGateHandler(
  _store: CreditsStore,
  _config: AccessCreditsConfig,
) {
  return (event: ToolCallEvent): void => {
    const toolName = event.context.toolName;
    if (toolName && SELF_TOOLS.has(toolName)) return;

    // Only block if this session was triggered by a gated message AND denied
    if (!isSessionTriggered(event.sessionKey) || !isSessionDenied(event.sessionKey)) return;

    if (event.context.block) {
      event.context.block(
        "Access denied: user does not have enough credits to use tools.",
      );
    }
  };
}
