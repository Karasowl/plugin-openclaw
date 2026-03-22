import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import {
  isSessionDenied,
  isSessionTriggered,
  getDenialReason,
  clearSession,
  getSessionKeyByChannel,
  getSender,
} from "../gate-state.js";

/**
 * OpenClaw lifecycle hook: message_sending
 * Registered via api.on("message_sending", handler).
 *
 * Contract: (event, ctx) => { content?, cancel? } | void
 *
 * NOTE: message_sending context does NOT include sessionKey.
 * We bridge via channelId:accountId:conversationId:senderId composite key
 * set in message:received. event.to = the original sender.
 */

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

/**
 * HARD GATE - Layer 3
 * If the session was triggered AND denied, replace the bot's outbound message
 * with the appropriate denial reason.
 *
 * Credit deduction is handled in message:received (which has the real
 * sessionKey). This hook only does content replacement for denied sessions.
 *
 * KNOWN LIMITATION: message_sending does not receive sessionKey from OpenClaw.
 * Session correlation uses a FIFO bridge keyed by
 * channelId:accountId:conversationId:senderId. If two responses for the same
 * sender in the same conversation are delivered out of order, the bridge may
 * match the wrong session. Because credits are already deducted at admission
 * (in message:received), the billing impact is zero — only the denial message
 * type could be swapped (cooldown ↔ no_credits) in that rare edge case.
 */
export function createMessageSendingGateHandler(
  store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
) {
  return (event: MessageSendingEvent, ctx: MessageContext): MessageSendingResult | void => {
    // event.to = the original sender (bot is replying to them)
    // Look up sessionKey via full conversation+sender composite key (FIFO)
    const sessionKey = getSessionKeyByChannel({
      channelId: ctx.channelId,
      accountId: ctx.accountId,
      conversationId: ctx.conversationId,
      senderId: event.to,
    });
    if (!sessionKey) return;

    // Only act on sessions triggered by a gated message
    if (!isSessionTriggered(sessionKey)) return;

    const config = getConfig();

    if (isSessionDenied(sessionKey)) {
      // Denied: replace the response with reason-appropriate message
      const reason = getDenialReason(sessionKey);
      clearSession(sessionKey);

      if (reason === "cooldown") {
        return {
          content: `⏳ Espera un momento antes de enviar otra consulta al bot.`,
        };
      }

      const senderId = getSender(sessionKey) ?? event.to;
      const user = senderId ? store.getUser(senderId) : null;
      const balance = user?.credits ?? 0;
      return {
        content:
          `⛔ No tienes créditos suficientes para usar el bot. Tu balance: ${balance}. ` +
          `Necesitas ${config.costPerMessage} crédito(s) por interacción.`,
      };
    }

    // Admitted: credits already deducted in message:received. Just clean up.
    clearSession(sessionKey);
  };
}
