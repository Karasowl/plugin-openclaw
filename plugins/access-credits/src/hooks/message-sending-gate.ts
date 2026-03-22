import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionDenied, isSessionTriggered, getDenialReason, clearSession } from "../gate-state.js";

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
 * If the session was triggered AND denied, replace the bot's outbound message.
 * Also handles automatic credit deduction for allowed messages.
 */
export function createMessageSendingGateHandler(
  store: CreditsStore,
  config: AccessCreditsConfig,
) {
  return (event: MessageSendingEvent): void => {
    // Only act on sessions triggered by a gated message
    if (!isSessionTriggered(event.sessionKey)) return;

    const senderId = event.context.senderId ?? event.context.from;

    if (isSessionDenied(event.sessionKey)) {
      // Denied: replace or cancel the response with reason-appropriate message
      const reason = getDenialReason(event.sessionKey);

      if (event.context.replaceContent) {
        if (reason === "cooldown") {
          event.context.replaceContent(
            `⏳ Espera un momento antes de enviar otra consulta al bot.`,
          );
        } else {
          const user = senderId ? store.getUser(senderId) : null;
          const balance = user?.credits ?? 0;
          event.context.replaceContent(
            `⛔ No tienes créditos suficientes para usar el bot. Tu balance: ${balance}. ` +
            `Necesitas ${config.costPerMessage} crédito(s) por interacción.`,
          );
        }
      } else if (event.context.cancel) {
        event.context.cancel();
      }

      clearSession(event.sessionKey);
      return;
    }

    // Allowed: auto-deduct credits (don't depend on the model calling the tool)
    if (senderId && !config.adminUsers.includes(senderId)) {
      const result = store.deductIfSufficient(senderId, config.costPerMessage, "Bot interaction");

      // Race protection: if another session consumed the last credits between
      // message-gate admission and now, block this response
      if (!result.success) {
        if (event.context.replaceContent) {
          event.context.replaceContent(
            `⛔ No tienes créditos suficientes para usar el bot. Tu balance: ${result.balance}. ` +
            `Necesitas ${config.costPerMessage} crédito(s) por interacción.`,
          );
        } else if (event.context.cancel) {
          event.context.cancel();
        }
        clearSession(event.sessionKey);
        return;
      }
    }

    clearSession(event.sessionKey);
  };
}
