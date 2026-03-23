/**
 * Lightweight Telegram Bot API client.
 * Uses native fetch — no external dependencies.
 */

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  description?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramChatMember {
  user: { id: number; first_name: string; username?: string };
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
}

export interface TelegramClient {
  getMe(): Promise<TelegramBotInfo>;
  getChat(chatId: string | number): Promise<TelegramChat>;
  getChatMembersCount(chatId: string | number): Promise<number>;
  getChatAdministrators(chatId: string | number): Promise<TelegramChatMember[]>;
}

export function createTelegramClient(token: string): TelegramClient {
  const base = `https://api.telegram.org/bot${token}`;

  async function call<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${base}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: params ? JSON.stringify(params) : undefined,
    });
    const data = await res.json() as { ok: boolean; result: T; description?: string };
    if (!data.ok) throw new Error(`Telegram API error: ${data.description || "unknown"}`);
    return data.result;
  }

  return {
    getMe: () => call<TelegramBotInfo>("getMe"),
    getChat: (chatId) => call<TelegramChat>("getChat", { chat_id: chatId }),
    getChatMembersCount: (chatId) => call<number>("getChatMembersCount", { chat_id: chatId }),
    getChatAdministrators: (chatId) => call<TelegramChatMember[]>("getChatAdministrators", { chat_id: chatId }),
  };
}
