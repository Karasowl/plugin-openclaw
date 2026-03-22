import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";

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

function matchesTrigger(content: string, config: AccessCreditsConfig): boolean {
  const lower = content.toLowerCase().trim();

  for (const hashtag of config.triggerHashtags) {
    if (lower.includes(hashtag.toLowerCase())) return true;
  }

  for (const command of config.triggerCommands) {
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

export function createMessageGateHandler(store: CreditsStore, config: AccessCreditsConfig) {
  return async (event: MessageEvent): Promise<void> => {
    if (event.type !== "message" || event.action !== "received") return;

    const content = event.context.content;
    if (!content) return;

    if (!matchesTrigger(content, config)) return;

    const senderId = extractSenderId(event);
    if (!senderId) return;

    if (config.adminUsers.includes(senderId)) return;

    const senderName = event.context.metadata?.senderName ?? event.context.metadata?.senderUsername;
    const user = store.getOrCreateUser(senderId, senderName);

    // In observe mode, just log the interaction without blocking
    if (config.mode === "observe") {
      store.recordInteraction(senderId);
      return;
    }

    // Cooldown check (hard gate, independent of LLM)
    if (store.isOnCooldown(senderId, config.cooldownSeconds)) {
      event.messages.push(
        `⏳ Espera un momento antes de enviar otra consulta al bot.`,
      );
      return;
    }

    if (user.credits < config.costPerMessage) {
      event.messages.push(
        `⛔ No tienes créditos suficientes. Tu balance: ${user.credits}. Necesitas ${config.costPerMessage} para interactuar con el bot.`,
      );
    }
  };
}
