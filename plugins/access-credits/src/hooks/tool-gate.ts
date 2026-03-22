import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionDenied, isSessionTriggered } from "../gate-state.js";

/**
 * OpenClaw lifecycle hook: before_tool_call
 * Registered via api.on("before_tool_call", handler).
 *
 * Contract: (event, ctx) => { block?, blockReason? } | void
 */

interface BeforeToolCallEvent {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
}

interface ToolContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  toolName: string;
  toolCallId?: string;
}

interface BeforeToolCallResult {
  block?: boolean;
  blockReason?: string;
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
  _getConfig: () => AccessCreditsConfig,
) {
  return (event: BeforeToolCallEvent, ctx: ToolContext): BeforeToolCallResult | void => {
    if (event.toolName && SELF_TOOLS.has(event.toolName)) return;

    const sessionKey = ctx.sessionKey;
    if (!sessionKey) return;

    // Only block if this session was triggered by a gated message AND denied
    if (!isSessionTriggered(sessionKey) || !isSessionDenied(sessionKey)) return;

    return {
      block: true,
      blockReason: "Access denied: user does not have enough credits to use tools.",
    };
  };
}
