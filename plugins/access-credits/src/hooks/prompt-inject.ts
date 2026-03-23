import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionTriggered, isSessionDenied, getDenialReason } from "../gate-state.js";

interface PromptBuildEvent {
  type: string;
  action: string;
  sessionKey: string;
  context: {
    senderId?: string;
    from?: string;
    content?: string;
    appendSystemContext?: (text: string) => void;
  };
}

export function createPromptInjectorHandler(
  store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
) {
  return (event: PromptBuildEvent): void => {
    const config = getConfig();
    if (config.mode === "observe") return;

    // Only act on sessions that were triggered by a gated message
    if (!isSessionTriggered(event.sessionKey)) return;

    const senderId = event.context.senderId ?? event.context.from;
    if (!senderId) return;

    const append = event.context.appendSystemContext;
    if (!append) return;

    if (config.adminUsers.includes(senderId)) return;

    // If session was denied, inject block instruction with correct reason
    if (isSessionDenied(event.sessionKey)) {
      const reason = getDenialReason(event.sessionKey);

      if (reason === "cooldown") {
        append(
          `[ACCESS-CREDITS] User "${senderId}" is on cooldown. ` +
          `DO NOT process their request. Reply ONLY with a brief message ` +
          `telling them to wait a moment before sending another query.`,
        );
      } else {
        const user = store.getUser(senderId);
        const balance = user?.credits ?? 0;
        append(
          `[ACCESS-CREDITS] User "${senderId}" has ${balance} credits. ` +
          `They need ${config.costPerMessage} credits to interact. ` +
          `DO NOT process their request. Reply ONLY with a brief message ` +
          `telling them they don't have enough credits and their current balance is ${balance}.`,
        );
      }
      return;
    }

    // User has credits - inject context (deduction is handled automatically by the runtime)
    const user = store.getUser(senderId);
    if (!user) return;

    const lines = [
      `[ACCESS-CREDITS] User "${senderId}" has ${user.credits} credits.`,
      `Each interaction costs ${config.costPerMessage} credit(s). Credits are deducted automatically.`,
    ];

    if (config.evaluateContributions) {
      const contentLength = event.context.content?.length ?? 0;
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

    append(lines.join(" "));
  };
}
