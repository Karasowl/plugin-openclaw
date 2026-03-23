import type { CreditsStore } from "../store/credits-store.js";
import type { GroupsStore } from "../store/groups-store.js";
import type { EventsStore } from "../store/events-store.js";
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getNestedValue(record: Record<string, unknown> | undefined, path: string): unknown {
  let current: unknown = record;
  for (const segment of path.split(".")) {
    const currentRecord = asRecord(current);
    if (!currentRecord) return undefined;
    current = currentRecord[segment];
  }
  return current;
}

function firstNonEmptyString(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstMetadataString(metadata: Record<string, unknown> | undefined, paths: string[]): string {
  for (const path of paths) {
    const value = getNestedValue(metadata, path);
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeTelegramChatId(chatId: string, channelId: string): string {
  const value = chatId.trim();
  if (!value) return "";

  const prefixed = /^telegram:(-?\d+)$/i.exec(value);
  if (prefixed) return prefixed[1];

  if (channelId === "telegram" && /^-?\d+$/.test(value)) return value;
  return value;
}

function resolveTrackedChatId(ctx: MessageReceivedContext): string {
  const metadata = asRecord(ctx.metadata) ?? undefined;
  const metadataChatId = firstMetadataString(metadata, [
    "telegramChatId",
    "chatId",
    "groupId",
    "conversation.id",
    "conversationId",
    "chat.id",
    "group.id",
  ]);

  return firstNonEmptyString(
    normalizeTelegramChatId(metadataChatId, ctx.channelId),
    normalizeTelegramChatId(typeof ctx.conversationId === "string" ? ctx.conversationId : "", ctx.channelId),
  );
}

function resolveTrackedChatTitle(ctx: MessageReceivedContext): string {
  const metadata = asRecord(ctx.metadata) ?? undefined;
  const directTitle = firstMetadataString(metadata, [
    "chatTitle",
    "groupName",
    "chatName",
    "conversationName",
    "roomName",
    "channelName",
    "subject",
    "chat.title",
    "group.title",
    "conversation.title",
    "room.title",
    "channel.title",
    "chat.name",
    "group.name",
    "conversation.name",
    "room.name",
    "channel.name",
  ]);

  if (directTitle) return directTitle;

  const fullName = [firstMetadataString(metadata, ["chat.first_name", "chat.firstName"]), firstMetadataString(metadata, ["chat.last_name", "chat.lastName"])]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || firstMetadataString(metadata, ["chat.username"]);
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

export function createMessageGateHandler(
  store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
  groupsStore?: GroupsStore,
  eventsStore?: EventsStore,
) {
  return async (event: InternalHookEvent): Promise<void> => {
    if (event.type !== "message" || event.action !== "received") return;
    if (!isMessageReceivedContext(event.context)) return;

    const ctx = event.context;
    const content = ctx.content;
    if (!content) return;

    const config = getConfig();

    const trackedChatId = resolveTrackedChatId(ctx);
    if (groupsStore && trackedChatId) {
      const chatTitle = resolveTrackedChatTitle(ctx);
      groupsStore.upsert(trackedChatId, chatTitle || ("Chat " + trackedChatId));
    }

    if (!matchesTrigger(content, config.triggerHashtags, config.triggerCommands)) return;

    // Check if this group has the credit system disabled
    if (trackedChatId && groupsStore && !groupsStore.isEnabled(trackedChatId)) return;

    const conversationId = typeof ctx.conversationId === "string" ? ctx.conversationId : undefined;

    const senderId = extractSenderId(ctx);

    // Mark the session as triggered + store sender/channel for lifecycle hooks
    markSessionTriggered(event.sessionKey);
    setSender(event.sessionKey, senderId);
    if (ctx.channelId) {
      setChannelSession({
        channelId: ctx.channelId,
        accountId: typeof ctx.accountId === "string" ? ctx.accountId : undefined,
        conversationId,
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

    // Emit event for new user creation
    if (user.credits === config.initialCredits && user.totalSpent === 0 && user.totalEarned === config.initialCredits) {
      eventsStore?.push("user_joined", `New user: ${senderName || senderId} (${config.initialCredits} credits)`, { userId: senderId });
    }

    // Cooldown check BEFORE recording interaction (both modes)
    if (store.isOnCooldown(senderId, config.cooldownSeconds)) {
      if (config.mode === "enforce") {
        markSessionDenied(event.sessionKey, "cooldown");
        event.messages.push(
          `⏳ Please wait a moment before sending another query.`,
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
        `⛔ You don't have enough credits. Your balance: ${result.balance}. You need ${config.costPerMessage} to interact with the bot.`,
      );
    } else {
      eventsStore?.push("credits_deducted", `${senderName || senderId}: -${config.costPerMessage} credit (balance: ${result.balance})`, { userId: senderId });
    }
  };
}
