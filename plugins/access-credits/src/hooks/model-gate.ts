import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionDenied, isSessionTriggered } from "../gate-state.js";

/**
 * OpenClaw lifecycle hook: before_model_resolve
 * Registered via api.on("before_model_resolve", handler).
 *
 * Contract: (event, ctx) => { modelOverride? } | void
 */

interface BeforeModelResolveEvent {
  prompt: string;
}

interface AgentContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  messageProvider?: string;
  trigger?: string;
  channelId?: string;
}

interface BeforeModelResolveResult {
  modelOverride?: string;
  providerOverride?: string;
}

/**
 * Layer 4 - Cost reduction
 * Only redirect to cheap model if this session was triggered AND denied.
 */
export function createModelGateHandler(
  _store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
): (event: BeforeModelResolveEvent, ctx: AgentContext) => BeforeModelResolveResult | void {
  return (event: BeforeModelResolveEvent, ctx: AgentContext): BeforeModelResolveResult | void => {
    // Agent filtering: skip if this agent isn't in the configured list
    const config = getConfig();
    if (config.agentIds?.length > 0 && ctx.agentId && !config.agentIds.includes(ctx.agentId)) {
      return;
    }

    const sessionKey = ctx.sessionKey;
    if (!sessionKey) return;

    if (!isSessionTriggered(sessionKey) || !isSessionDenied(sessionKey)) {
      return undefined;
    }

    return { modelOverride: config.fallbackModel };
  };
}
