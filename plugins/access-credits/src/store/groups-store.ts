import type { RuntimeStore } from "./credits-store.js";
import type { GroupInfo } from "./types.js";
import type { TelegramClient } from "../telegram/telegram-api.js";

const STORE_KEY = "ac:groups";

export interface GroupsStore {
  getAll(): GroupInfo[];
  getById(chatId: string): GroupInfo | null;
  upsert(chatId: string, chatTitle: string): GroupInfo;
  isEnabled(chatId: string): boolean;
  setEnabled(chatId: string, enabled: boolean): GroupInfo | null;
  setStatus(chatId: string, status: "active" | "paused"): GroupInfo | null;
  refreshFromTelegram(client: TelegramClient): Promise<GroupInfo[]>;
}

function normalizeTelegramChatId(chatId: string): string | null {
  const value = chatId.trim();
  if (!value) return null;

  const prefixed = /^telegram:(-?\d+)$/i.exec(value);
  if (prefixed) return prefixed[1];

  return /^-?\d+$/.test(value) ? value : null;
}

function canonicalizeChatId(chatId: string): string {
  const trimmed = chatId.trim();
  return normalizeTelegramChatId(trimmed) ?? trimmed;
}

function isPlaceholderTitle(title: string | undefined, chatId: string): boolean {
  if (!title) return true;
  const normalized = canonicalizeChatId(chatId);
  return title === chatId ||
    title === normalized ||
    title === `Chat ${chatId}` ||
    title === `Chat ${normalized}` ||
    title === `Group ${chatId}` ||
    title === `Group ${normalized}`;
}

function laterIsoTimestamp(left: string | undefined, right: string | undefined): string {
  if (!left) return right || new Date().toISOString();
  if (!right) return left;
  return left >= right ? left : right;
}

function mergeGroups(existing: GroupInfo | undefined, incoming: GroupInfo, chatId: string): GroupInfo {
  if (!existing) return { ...incoming, chatId };

  return {
    chatId,
    chatTitle: isPlaceholderTitle(existing.chatTitle, chatId) && !isPlaceholderTitle(incoming.chatTitle, chatId)
      ? incoming.chatTitle
      : existing.chatTitle || incoming.chatTitle,
    memberCount: Math.max(existing.memberCount || 0, incoming.memberCount || 0),
    status: existing.status === "paused" || incoming.status === "paused" ? "paused" : "active",
    enabled: existing.enabled !== false && incoming.enabled !== false,
    lastActivity: laterIsoTimestamp(existing.lastActivity, incoming.lastActivity),
  };
}

function resolveTelegramChatTitle(
  chat: { title?: string; first_name?: string; last_name?: string; username?: string },
  fallback: string,
): string {
  if (chat.title) return chat.title;

  const fullName = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  if (chat.username) return chat.username;
  return fallback;
}

export function createGroupsStore(runtimeStore: RuntimeStore): GroupsStore {
  function getData(): Record<string, GroupInfo> {
    const raw = runtimeStore.get(STORE_KEY) as Record<string, GroupInfo> | undefined;
    const groups = raw ?? {};
    let changed = false;
    const normalized: Record<string, GroupInfo> = {};

    for (const [key, group] of Object.entries(groups)) {
      const chatId = canonicalizeChatId(key || group.chatId || "");
      const next: GroupInfo = {
        chatId,
        chatTitle: group.chatTitle || chatId,
        memberCount: group.memberCount || 0,
        status: group.status === "paused" ? "paused" : "active",
        enabled: group.enabled !== false,
        lastActivity: group.lastActivity || new Date().toISOString(),
      };

      normalized[chatId] = mergeGroups(normalized[chatId], next, chatId);
      if (chatId !== key || group.chatId !== chatId) changed = true;
    }

    if (changed) {
      runtimeStore.set(STORE_KEY, normalized);
    }

    return normalized;
  }
  function saveData(groups: Record<string, GroupInfo>): void {
    runtimeStore.set(STORE_KEY, groups);
  }

  return {
    getAll(): GroupInfo[] {
      return Object.values(getData());
    },

    getById(chatId: string): GroupInfo | null {
      return getData()[canonicalizeChatId(chatId)] ?? null;
    },

    upsert(chatId: string, chatTitle: string): GroupInfo {
      const groups = getData();
      const key = canonicalizeChatId(chatId);
      const now = new Date().toISOString();
      const title = chatTitle?.trim() || "";

      if (groups[key]) {
        if (title && isPlaceholderTitle(groups[key].chatTitle, key)) {
          groups[key].chatTitle = title;
        } else if (title && !isPlaceholderTitle(title, key)) {
          groups[key].chatTitle = title;
        }
        groups[key].lastActivity = now;
        saveData(groups);
        return groups[key];
      }

      const group: GroupInfo = {
        chatId: key,
        chatTitle: title || key,
        memberCount: 0,
        status: "active",
        enabled: true,
        lastActivity: now,
      };
      groups[key] = group;
      saveData(groups);
      return group;
    },

    isEnabled(chatId: string): boolean {
      const group = getData()[canonicalizeChatId(chatId)];
      // If group is unknown, default to enabled (don't block by default)
      return group?.enabled !== false;
    },

    setEnabled(chatId: string, enabled: boolean): GroupInfo | null {
      const groups = getData();
      const key = canonicalizeChatId(chatId);
      if (!groups[key]) return null;
      groups[key].enabled = enabled;
      saveData(groups);
      return groups[key];
    },

    setStatus(chatId: string, status: "active" | "paused"): GroupInfo | null {
      const groups = getData();
      const key = canonicalizeChatId(chatId);
      if (!groups[key]) return null;
      groups[key].status = status;
      saveData(groups);
      return groups[key];
    },

    async refreshFromTelegram(client: TelegramClient): Promise<GroupInfo[]> {
      const groups = getData();
      const chatIds = Object.keys(groups);
      const results: GroupInfo[] = [];

      for (const chatId of chatIds) {
        const telegramChatId = normalizeTelegramChatId(chatId);
        if (!telegramChatId) {
          results.push(groups[chatId]);
          continue;
        }

        try {
          const chat = await client.getChat(telegramChatId);
          const count = await client.getChatMembersCount(telegramChatId);
          groups[chatId].chatTitle = resolveTelegramChatTitle(chat, groups[chatId].chatTitle);
          groups[chatId].memberCount = count;
          groups[chatId].lastActivity = new Date().toISOString();
          results.push(groups[chatId]);
        } catch {
          // Group may have been deleted or bot removed — keep existing data
          results.push(groups[chatId]);
        }
      }

      saveData(groups);
      return results;
    },
  };
}
