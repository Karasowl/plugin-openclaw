import type {
  AccessContextKind,
  AccessCreditsConfig,
  ResolvedDirectMessageModel,
} from "../config.js";
import {
  getContextConfig,
  resolveDirectMessageModel,
  resolveInteractionCost,
} from "../config.js";
import type { CreditsStore } from "../store/credits-store.js";
import type { GroupsStore } from "../store/groups-store.js";
import type { EventsStore } from "../store/events-store.js";
import {
  markSessionDenied,
  markSessionTriggered,
  setSender,
  setChannelSession,
  setSessionAccessInfo,
} from "../gate-state.js";

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

interface ModelCommand {
  alias?: string;
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

function firstMetadataBoolean(metadata: Record<string, unknown> | undefined, paths: string[]): boolean | undefined {
  for (const path of paths) {
    const value = getNestedValue(metadata, path);
    if (typeof value === "boolean") return value;
  }
  return undefined;
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

  const fullName = [
    firstMetadataString(metadata, ["chat.first_name", "chat.firstName"]),
    firstMetadataString(metadata, ["chat.last_name", "chat.lastName"]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || firstMetadataString(metadata, ["chat.username"]);
}

function resolveContextKind(ctx: MessageReceivedContext): AccessContextKind {
  const metadata = asRecord(ctx.metadata) ?? undefined;
  const explicitChatType = firstMetadataString(metadata, [
    "chatType",
    "session.chatType",
    "chat.chatType",
    "chat.type",
    "conversation.chatType",
    "conversation.type",
  ]).toLowerCase();

  if (explicitChatType === "group" || explicitChatType === "supergroup" || explicitChatType === "channel") {
    return "group";
  }
  if (explicitChatType === "direct" || explicitChatType === "dm" || explicitChatType === "private") {
    return "direct";
  }

  const isGroup = firstMetadataBoolean(metadata, ["isGroup", "chat.isGroup", "group.isGroup"]);
  if (typeof isGroup === "boolean") {
    return isGroup ? "group" : "direct";
  }

  const trackedChatId = resolveTrackedChatId(ctx);
  if (ctx.channelId === "telegram" && trackedChatId.startsWith("-")) {
    return "group";
  }

  const hasGroupMarkers = Boolean(
    firstMetadataString(metadata, ["groupId", "group.id", "chat.title", "group.title", "conversation.title"]),
  );
  return hasGroupMarkers ? "group" : "direct";
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

function extractSenderName(ctx: MessageReceivedContext): string | undefined {
  return typeof ctx.metadata?.senderName === "string"
    ? ctx.metadata.senderName
    : typeof ctx.metadata?.senderUsername === "string"
      ? ctx.metadata.senderUsername
      : undefined;
}

function primeSession(
  event: InternalHookEvent,
  ctx: MessageReceivedContext,
  senderId: string,
): void {
  const conversationId = typeof ctx.conversationId === "string" ? ctx.conversationId : undefined;

  markSessionTriggered(event.sessionKey);
  setSender(event.sessionKey, senderId);
  setChannelSession({
    channelId: ctx.channelId,
    accountId: typeof ctx.accountId === "string" ? ctx.accountId : undefined,
    conversationId,
    senderId,
  }, event.sessionKey);
}

function parseModelCommand(content: string): ModelCommand | null {
  const match = /^\/model(?:\s+(.+))?$/i.exec(content.trim());
  if (!match) return null;

  const alias = match[1]?.trim().toLowerCase();
  return alias ? { alias } : {};
}

function formatModelCommandResponse(
  config: AccessCreditsConfig,
  balance: number,
  selectedModel: ResolvedDirectMessageModel | null,
): string {
  const lines = [
    `Your current balance is ${balance} credit(s).`,
    "",
    "Available DM models:",
  ];

  for (const [alias, option] of Object.entries(config.directMessages.models)) {
    const marker = selectedModel?.alias === alias ? " (current)" : "";
    lines.push(`- ${alias}: ${option.label} (${option.costPerMessage} credit(s))${marker}`);
  }

  lines.push("");
  lines.push("Use /model <alias> to switch models.");
  return lines.join("\n");
}

function setCustomResponse(
  event: InternalHookEvent,
  config: AccessCreditsConfig,
  contextKind: AccessContextKind,
  response: string,
  selectedModel: ResolvedDirectMessageModel | null,
): void {
  const costPerMessage = resolveInteractionCost(config, contextKind, { selectedModel: selectedModel?.alias });
  setSessionAccessInfo(event.sessionKey, {
    contextKind,
    costPerMessage,
    cooldownSeconds: getContextConfig(config, contextKind).cooldownSeconds,
    selectedModelAlias: selectedModel?.alias,
    selectedModelLabel: selectedModel?.option.label,
    selectedModelId: selectedModel?.option.model,
    customResponse: response,
  });
  markSessionDenied(event.sessionKey, "custom_response");
  event.messages.push(response);
}

function handleModelSelectionCommand(
  event: InternalHookEvent,
  ctx: MessageReceivedContext,
  store: CreditsStore,
  config: AccessCreditsConfig,
  senderId: string,
  senderName: string | undefined,
  command: ModelCommand,
): boolean {
  primeSession(event, ctx, senderId);

  const user = store.getOrCreateUser(senderId, senderName);
  const currentSelection = resolveDirectMessageModel(config, user.preferences);

  if (!config.directMessages.enabled) {
    setCustomResponse(event, config, "direct", "Direct-message access is currently disabled.", currentSelection);
    return true;
  }

  if (!config.directMessages.allowModelChoice) {
    setCustomResponse(
      event,
      config,
      "direct",
      "Model choice is disabled for direct messages on this bot.",
      currentSelection,
    );
    return true;
  }

  if (!command.alias) {
    setCustomResponse(
      event,
      config,
      "direct",
      formatModelCommandResponse(config, user.credits, currentSelection),
      currentSelection,
    );
    return true;
  }

  const nextSelection = resolveDirectMessageModel(config, { selectedModel: command.alias });
  if (!nextSelection || nextSelection.alias !== command.alias) {
    const available = Object.keys(config.directMessages.models).join(", ");
    setCustomResponse(
      event,
      config,
      "direct",
      `Unknown model alias "${command.alias}". Available models: ${available}.`,
      currentSelection,
    );
    return true;
  }

  const isAdmin = config.adminUsers.includes(senderId);
  if (!isAdmin && user.credits < nextSelection.option.costPerMessage) {
    setCustomResponse(
      event,
      config,
      "direct",
      `You need ${nextSelection.option.costPerMessage} credit(s) to select ${nextSelection.option.label}. Your balance is ${user.credits}.`,
      currentSelection,
    );
    return true;
  }

  store.setUserPreferences(senderId, { selectedModel: nextSelection.alias });
  setCustomResponse(
    event,
    config,
    "direct",
    `Model set to ${nextSelection.option.label} (${nextSelection.option.costPerMessage} credit(s) per message).`,
    nextSelection,
  );
  return true;
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
    const contextKind = resolveContextKind(ctx);
    const trackedChatId = resolveTrackedChatId(ctx);

    if (contextKind === "group" && groupsStore && trackedChatId) {
      const chatTitle = resolveTrackedChatTitle(ctx);
      groupsStore.upsert(trackedChatId, chatTitle || ("Chat " + trackedChatId));
      if (!groupsStore.isEnabled(trackedChatId)) return;
    }

    const senderId = extractSenderId(ctx);
    const senderName = extractSenderName(ctx);

    const modelCommand = contextKind === "direct" ? parseModelCommand(content) : null;
    if (modelCommand) {
      handleModelSelectionCommand(event, ctx, store, config, senderId, senderName, modelCommand);
      return;
    }

    if (!matchesTrigger(content, config.triggerHashtags, config.triggerCommands)) return;

    const contextConfig = getContextConfig(config, contextKind);
    if (!contextConfig.enabled) return;

    primeSession(event, ctx, senderId);

    const existingUser = store.getUser(senderId);
    const selectedModel = contextKind === "direct"
      ? resolveDirectMessageModel(config, existingUser?.preferences)
      : null;
    const interactionCost = resolveInteractionCost(config, contextKind, existingUser?.preferences);

    setSessionAccessInfo(event.sessionKey, {
      contextKind,
      costPerMessage: interactionCost,
      cooldownSeconds: contextConfig.cooldownSeconds,
      selectedModelAlias: selectedModel?.alias,
      selectedModelLabel: selectedModel?.option.label,
      selectedModelId: selectedModel?.option.model,
    });

    if (config.adminUsers.includes(senderId)) return;

    const user = store.getOrCreateUser(senderId, senderName);

    // Emit event for new user creation
    if (user.credits === config.initialCredits && user.totalSpent === 0 && user.totalEarned === config.initialCredits) {
      eventsStore?.push("user_joined", `New user: ${senderName || senderId} (${config.initialCredits} credits)`, { userId: senderId });
    }

    if (store.isOnCooldown(senderId, contextConfig.cooldownSeconds)) {
      if (config.mode === "enforce") {
        markSessionDenied(event.sessionKey, "cooldown");
        event.messages.push("⏳ Please wait a moment before sending another query.");
      }
      return;
    }

    store.recordInteraction(senderId);

    if (config.mode === "observe") return;

    const reason = selectedModel
      ? `Bot interaction (${selectedModel.option.label})`
      : "Bot interaction";
    const result = store.deductIfSufficient(senderId, interactionCost, reason);
    if (!result.success) {
      markSessionDenied(event.sessionKey, "no_credits");
      event.messages.push(
        `⛔ You don't have enough credits. Your balance: ${result.balance}. You need ${interactionCost} to interact with the bot.`,
      );
    } else {
      const suffix = selectedModel ? ` via ${selectedModel.option.label}` : "";
      eventsStore?.push(
        "credits_deducted",
        `${senderName || senderId}: -${interactionCost} credit(s)${suffix} (balance: ${result.balance})`,
        { userId: senderId },
      );
    }
  };
}
