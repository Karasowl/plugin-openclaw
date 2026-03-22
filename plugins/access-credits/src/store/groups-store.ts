import type { RuntimeStore } from "./credits-store.js";
import type { GroupInfo } from "./types.js";

const STORE_KEY = "ac:groups";

export interface GroupsStore {
  getAll(): GroupInfo[];
  getById(chatId: string): GroupInfo | null;
  upsert(chatId: string, chatTitle: string): GroupInfo;
  incrementMembers(chatId: string): void;
  setStatus(chatId: string, status: "active" | "paused"): GroupInfo | null;
}

export function createGroupsStore(runtimeStore: RuntimeStore): GroupsStore {
  function getData(): Record<string, GroupInfo> {
    const raw = runtimeStore.get(STORE_KEY) as Record<string, GroupInfo> | undefined;
    return raw ?? {};
  }
  function saveData(groups: Record<string, GroupInfo>): void {
    runtimeStore.set(STORE_KEY, groups);
  }

  return {
    getAll(): GroupInfo[] {
      return Object.values(getData());
    },

    getById(chatId: string): GroupInfo | null {
      return getData()[chatId] ?? null;
    },

    upsert(chatId: string, chatTitle: string): GroupInfo {
      const groups = getData();
      const now = new Date().toISOString();

      if (groups[chatId]) {
        groups[chatId].chatTitle = chatTitle || groups[chatId].chatTitle;
        groups[chatId].lastActivity = now;
        saveData(groups);
        return groups[chatId];
      }

      const group: GroupInfo = {
        chatId,
        chatTitle: chatTitle || chatId,
        memberCount: 0,
        status: "active",
        lastActivity: now,
      };
      groups[chatId] = group;
      saveData(groups);
      return group;
    },

    incrementMembers(chatId: string): void {
      const groups = getData();
      if (groups[chatId]) {
        groups[chatId].memberCount += 1;
        saveData(groups);
      }
    },

    setStatus(chatId: string, status: "active" | "paused"): GroupInfo | null {
      const groups = getData();
      if (!groups[chatId]) return null;
      groups[chatId].status = status;
      saveData(groups);
      return groups[chatId];
    },
  };
}
