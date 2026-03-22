import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";

interface MessageSendingEvent {
  type: string;
  action: string;
  sessionKey: string;
  context: {
    to?: string;
    content?: string;
    senderId?: string;
    from?: string;
    channelId?: string;
    cancel?: () => void;
    replaceContent?: (content: string) => void;
  };
}

/**
 * HARD GATE - Layer 3
 * If the user has no credits, cancel or replace the bot's outbound message.
 * This is a hard block: even if the model generates a response, the user never sees it.
 */
export function createMessageSendingGateHandler(
  store: CreditsStore,
  config: AccessCreditsConfig,
) {
  return (event: MessageSendingEvent): void => {
    const senderId = event.context.senderId ?? event.context.from;
    if (!senderId) return;

    if (config.adminUsers.includes(senderId)) return;

    if (store.hasEnoughCredits(senderId, config.costPerMessage)) return;

    const balance = store.getUser(senderId)?.credits ?? 0;

    if (event.context.replaceContent) {
      event.context.replaceContent(
        `⛔ No tienes créditos suficientes para usar el bot. Tu balance: ${balance}. ` +
        `Necesitas ${config.costPerMessage} crédito(s) por interacción.`,
      );
    } else if (event.context.cancel) {
      event.context.cancel();
    }
  };
}
