import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { markSessionDenied, markSessionTriggered } from "../gate-state.js";

interface MessageEvent {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context: {
    from?: string;
    content?: string;
    channelId?: string;
    metadata?: {
      senderId?: string;
      senderName?: string;
      senderUsername?: string;
    };
  };
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

function extractSenderId(event: MessageEvent): string | null {
  return (
    event.context.metadata?.senderId ??
    event.context.from ??
    null
  );
}

export function createMessageGateHandler(store: CreditsStore, getConfig: () => AccessCreditsConfig) {
  return async (event: MessageEvent): Promise<void> => {
    if (event.type !== "message" || event.action !== "received") return;

    const content = event.context.content;
    if (!content) return;

    const config = getConfig();

    if (!matchesTrigger(content, config.triggerHashtags, config.triggerCommands)) return;

    // This message matches a trigger - mark the session so hard gates know to act
    markSessionTriggered(event.sessionKey);

    const senderId = extractSenderId(event);
    if (!senderId) return;

    if (config.adminUsers.includes(senderId)) return;

    const senderName = event.context.metadata?.senderName ?? event.context.metadata?.senderUsername;
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

    if (user.credits < config.costPerMessage) {
      markSessionDenied(event.sessionKey, "no_credits");
      event.messages.push(
        `⛔ No tienes créditos suficientes. Tu balance: ${user.credits}. Necesitas ${config.costPerMessage} para interactuar con el bot.`,
      );
    }
  };
}
