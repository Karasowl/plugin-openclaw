import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import type { MessagingStore } from "../store/messaging-store.js";
import type { TranslateService } from "../services/translate.js";
import {
  isSessionDenied,
  isSessionTriggered,
  getDenialReason,
  clearSession,
  getSessionKeyByChannel,
  getSender,
} from "../gate-state.js";

interface MessageSendingEvent {
  to: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface MessageContext {
  channelId: string;
  accountId?: string;
  conversationId?: string;
}

interface MessageSendingResult {
  content?: string;
  cancel?: boolean;
}

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

/**
 * HARD GATE - Layer 3
 * If the session was triggered AND denied, replace the bot's outbound message
 * with the appropriate denial reason using templates from messaging store.
 */
export function createMessageSendingGateHandler(
  store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
  messagingStore?: MessagingStore,
  translateService?: TranslateService,
) {
  return (event: MessageSendingEvent, ctx: MessageContext): MessageSendingResult | void => {
    const sessionKey = getSessionKeyByChannel({
      channelId: ctx.channelId,
      accountId: ctx.accountId,
      conversationId: ctx.conversationId,
      senderId: event.to,
    });
    if (!sessionKey) return;

    if (!isSessionTriggered(sessionKey)) return;

    const config = getConfig();

    if (isSessionDenied(sessionKey)) {
      const reason = getDenialReason(sessionKey);
      clearSession(sessionKey);

      const senderId = getSender(sessionKey) ?? event.to;
      const user = senderId ? store.getUser(senderId) : null;
      const balance = user?.credits ?? 0;
      const messaging = messagingStore?.get();

      const vars: Record<string, string> = {
        user_name: user?.displayName || senderId || "User",
        credit_balance: String(balance),
        cost: String(config.costPerMessage),
        cooldown: String(config.cooldownSeconds),
      };

      let message: string;
      if (reason === "cooldown") {
        message = messaging?.templates?.cooldown
          ? interpolateTemplate(messaging.templates.cooldown, vars)
          : `⏳ Please wait a moment before sending another query.`;
      } else {
        message = messaging?.templates?.insufficient_credits
          ? interpolateTemplate(messaging.templates.insufficient_credits, vars)
          : `⛔ You don't have enough credits. Your balance: ${balance}. You need ${config.costPerMessage} credit(s) to interact.`;
      }

      return { content: message };
    }

    // Admitted: credits already deducted in message:received. Just clean up.
    clearSession(sessionKey);
  };
}
