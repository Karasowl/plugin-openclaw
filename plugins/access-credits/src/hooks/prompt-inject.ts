import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";

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
  config: AccessCreditsConfig,
) {
  return (event: PromptBuildEvent): void => {
    // In observe mode, skip prompt injection entirely
    if (config.mode === "observe") return;

    const senderId = event.context.senderId ?? event.context.from;
    if (!senderId) return;

    const append = event.context.appendSystemContext;
    if (!append) return;

    if (config.adminUsers.includes(senderId)) return;

    const user = store.getUser(senderId);

    if (!user || user.credits < config.costPerMessage) {
      const balance = user?.credits ?? 0;
      append(
        `[ACCESS-CREDITS] User "${senderId}" has ${balance} credits. ` +
        `They need ${config.costPerMessage} credits to interact. ` +
        `DO NOT process their request. Reply ONLY with a brief message ` +
        `telling them they don't have enough credits and their current balance is ${balance}.`,
      );
      return;
    }

    const lines = [
      `[ACCESS-CREDITS] User "${senderId}" has ${user.credits} credits.`,
      `Each interaction costs ${config.costPerMessage} credit(s).`,
      `After responding, use the "access_credits_deduct" tool to deduct ${config.costPerMessage} credit(s) from user "${senderId}".`,
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
