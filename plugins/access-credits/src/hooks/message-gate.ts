import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { markSessionDenied, markSessionTriggered, setSender, setChannelSession } from "../gate-state.js";

/**
 * InternalHookEvent shape — accepted by api.registerHook().
 * context is Record<string, unknown>; we narrow for "message:received" below.
 */
interface InternalHookEvent {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context: Record<string, unknown>;
}

/**
 * Narrowed context for type="message", action="received".
 * Matches OpenClaw's MessageReceivedHookContext.
 */
interface MessageReceivedContext {
  [key: string]: unknown;
  from: string;
  content: string;
  channelId: string;
  accountId?: string;
  conversationId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

function isMessageReceivedContext(ctx: Record<string, unknown>): ctx is MessageReceivedContext {
  return typeof ctx.from === "string" && typeof ctx.content === "string" && typeof ctx.channelId === "string";
}

function matchesTrigger(content: string, triggerHashtags: string[], triggerCommands: string[]): boolean {
  const lower = content.toLowerCase().trim();

  for (const hashtag of triggerHashtags) {
    if (lower.includes(hashtag.toLowerCase())) return true;
  }

  for (const command of triggerCommands) {
    if (lower.startsWith(command.toLowerCase())) return true;
  }

  return false;
}

function extractSenderId(ctx: MessageReceivedContext): string {
  const metaSenderId = ctx.metadata?.senderId;
  return (typeof metaSenderId === "string" ? metaSenderId : null) ?? ctx.from;
}

export function createMessageGateHandler(store: CreditsStore, getConfig: () => AccessCreditsConfig) {
  return async (event: InternalHookEvent): Promise<void> => {
    if (event.type !== "message" || event.action !== "received") return;
    if (!isMessageReceivedContext(event.context)) return;

    const ctx = event.context;
    const content = ctx.content;
    if (!content) return;

    const config = getConfig();

    if (!matchesTrigger(content, config.triggerHashtags, config.triggerCommands)) return;

    const senderId = extractSenderId(ctx);

    // Mark the session as triggered + store sender/channel for lifecycle hooks
    markSessionTriggered(event.sessionKey);
    setSender(event.sessionKey, senderId);
    if (ctx.channelId) {
      setChannelSession({
        channelId: ctx.channelId,
        accountId: typeof ctx.accountId === "string" ? ctx.accountId : undefined,
        conversationId: typeof ctx.conversationId === "string" ? ctx.conversationId : undefined,
        senderId,
      }, event.sessionKey);
    }

    if (config.adminUsers.includes(senderId)) return;

    const senderName = typeof ctx.metadata?.senderName === "string"
      ? ctx.metadata.senderName
      : typeof ctx.metadata?.senderUsername === "string"
        ? ctx.metadata.senderUsername
        : undefined;
    const user = store.getOrCreateUser(senderId, senderName);

    // Cooldown check BEFORE recording interaction (both modes)
    if (store.isOnCooldown(senderId, config.cooldownSeconds)) {
      if (config.mode === "enforce") {
        markSessionDenied(event.sessionKey, "cooldown");
        event.messages.push(
          `⏳ Espera un momento antes de enviar otra consulta al bot.`,
        );
      }
      return;
    }

    // Record interaction only after passing cooldown check
    store.recordInteraction(senderId);

    // In observe mode, just log the interaction without blocking
    if (config.mode === "observe") return;

    // Deduct credits here (has real sessionKey) rather than in message_sending
    // (which uses a FIFO heuristic and can misattribute out-of-order responses).
    const result = store.deductIfSufficient(senderId, config.costPerMessage, "Bot interaction");
    if (!result.success) {
      markSessionDenied(event.sessionKey, "no_credits");
      event.messages.push(
        `⛔ No tienes créditos suficientes. Tu balance: ${result.balance}. Necesitas ${config.costPerMessage} para interactuar con el bot.`,
      );
    }
  };
}
