import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionTriggered, isSessionDenied, getDenialReason, getSender } from "../gate-state.js";

/**
 * OpenClaw lifecycle hook: before_prompt_build
 * Registered via api.on("before_prompt_build", handler).
 *
 * Contract: (event, ctx) => { appendSystemContext? } | void
 */

interface BeforePromptBuildEvent {
  prompt: string;
  messages: unknown[];
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

interface BeforePromptBuildResult {
  appendSystemContext?: string;
}

export function createPromptInjectorHandler(
  store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
) {
  return (event: BeforePromptBuildEvent, ctx: AgentContext): BeforePromptBuildResult | void => {
    const config = getConfig();
    if (config.mode === "observe") return;

    const sessionKey = ctx.sessionKey;
    if (!sessionKey) return;

    // Only act on sessions that were triggered by a gated message
    if (!isSessionTriggered(sessionKey)) return;

    // Sender was stored by message:received handler via gate-state bridge
    const senderId = getSender(sessionKey);
    if (!senderId) return;

    if (config.adminUsers.includes(senderId)) return;

    // If session was denied, inject block instruction with correct reason
    if (isSessionDenied(sessionKey)) {
      const reason = getDenialReason(sessionKey);

      if (reason === "cooldown") {
        return {
          appendSystemContext:
            `[ACCESS-CREDITS] User "${senderId}" is on cooldown. ` +
            `DO NOT process their request. Reply ONLY with a brief message ` +
            `telling them to wait a moment before sending another query.`,
        };
      }

      const user = store.getUser(senderId);
      const balance = user?.credits ?? 0;
      return {
        appendSystemContext:
          `[ACCESS-CREDITS] User "${senderId}" has ${balance} credits. ` +
          `They need ${config.costPerMessage} credits to interact. ` +
          `DO NOT process their request. Reply ONLY with a brief message ` +
          `telling them they don't have enough credits and their current balance is ${balance}.`,
      };
    }

    // User has credits — inject context (deduction handled by message_sending gate)
    const user = store.getUser(senderId);
    if (!user) return;

    const lines = [
      `[ACCESS-CREDITS] User "${senderId}" has ${user.credits} credits.`,
      `Each interaction costs ${config.costPerMessage} credit(s). Credits are deducted automatically.`,
    ];

    if (config.evaluateContributions) {
      // Use event.prompt as content measure (lifecycle hooks don't carry raw message)
      const contentLength = event.prompt?.length ?? 0;
      if (contentLength >= config.contributionMinLength) {
        lines.push(
          `The user's message is ${contentLength} characters long. ` +
          `Evaluate if it contains a genuinely valuable intellectual contribution ` +
          `(original insight, helpful knowledge, creative idea, useful resource). ` +
          `If so, use the "access_credits_award" tool to award them ${config.contributionReward} credit(s). ` +
          `Be selective: only reward real contributions, not casual chat or simple questions.`,
        );
      }
    }

    return { appendSystemContext: lines.join(" ") };
  };
}
