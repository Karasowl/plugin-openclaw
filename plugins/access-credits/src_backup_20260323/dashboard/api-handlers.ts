import type { IncomingMessage, ServerResponse } from "http";
import type { CreditsStore, RuntimeStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import type { PromptsStore } from "../store/prompts-store.js";
import type { GroupsStore } from "../store/groups-store.js";
import type { EventsStore } from "../store/events-store.js";
import type { MessagingStore } from "../store/messaging-store.js";
import type { TelegramClient } from "../telegram/telegram-api.js";
import { mergeConfigOverrides, resolveConfig } from "../config.js";
import { validateConfigPatch, loadConfigOverrides, saveConfigOverrides } from "../config-store.js";
import { buildDashboardHtml } from "./html.js";

export interface ConfigContainer {
  current: AccessCreditsConfig;
}

export interface DashboardStores {
  prompts: PromptsStore;
  groups: GroupsStore;
  events: EventsStore;
  messaging: MessagingStore;
}

function json(res: ServerResponse, status: number, data: unknown): boolean {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
  return true;
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

export function handleDashboardPage(
  req: IncomingMessage,
  res: ServerResponse,
  configContainer: ConfigContainer,
  gatewayToken: string,
): boolean {
  if (!gatewayToken) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Dashboard unavailable: gateway auth token could not be detected.");
    return true;
  }

  const url = new URL(req.url ?? "", "http://localhost");
  const providedToken = url.searchParams.get("token") ?? "";

  if (providedToken !== gatewayToken) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Unauthorized. Access the dashboard with ?token=YOUR_GATEWAY_TOKEN");
    return true;
  }

  const html = buildDashboardHtml(configContainer.current, providedToken);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(html);
  return true;
}

export function handleGetConfig(
  res: ServerResponse,
  configContainer: ConfigContainer,
): boolean {
  return json(res, 200, { config: configContainer.current });
}

export async function handlePatchConfig(
  req: IncomingMessage,
  res: ServerResponse,
  rawConfig: Record<string, unknown>,
  runtimeStore: RuntimeStore,
  configContainer: ConfigContainer,
): Promise<boolean> {
  let body: Record<string, unknown>;
  try {
    body = await parseBody(req);
  } catch {
    return json(res, 400, { error: "Invalid JSON body" });
  }

  const validation = validateConfigPatch(body);
  if (!validation.valid) {
    return json(res, 400, { errors: validation.errors });
  }

  const existing = loadConfigOverrides(runtimeStore);
  const merged = mergeConfigOverrides(existing, validation.sanitized);
  saveConfigOverrides(runtimeStore, merged);

  configContainer.current = resolveConfig(rawConfig, merged);

  return json(res, 200, { config: configContainer.current });
}

export function handleHealthCheck(
  res: ServerResponse,
  store: CreditsStore,
  configContainer: ConfigContainer,
): boolean {
  const stats = store.getStats();
  return json(res, 200, {
    version: "0.2.0",
    mode: configContainer.current.mode,
    storeStatus: "ok",
    totalUsers: stats.totalUsers,
    totalCreditsInCirculation: stats.totalCreditsInCirculation,
    totalTransactions: stats.totalTransactions,
  });
}

// --- New handlers for dashboard v2 ---

export function handleGetTemplates(
  res: ServerResponse,
  stores: DashboardStores,
): boolean {
  return json(res, 200, { templates: stores.prompts.getTemplates() });
}

export async function handlePatchTemplates(
  req: IncomingMessage,
  res: ServerResponse,
  stores: DashboardStores,
): Promise<boolean> {
  let body: Record<string, unknown>;
  try { body = await parseBody(req); } catch { return json(res, 400, { error: "Invalid JSON body" }); }
  const templates = stores.prompts.updateTemplates(body as Parameters<typeof stores.prompts.updateTemplates>[0]);
  stores.events.push("config_changed", "Injection templates updated");
  return json(res, 200, { templates });
}

export function handleGetGroups(
  res: ServerResponse,
  stores: DashboardStores,
): boolean {
  return json(res, 200, { groups: stores.groups.getAll() });
}

export function handleGetEvents(
  res: ServerResponse,
  stores: DashboardStores,
): boolean {
  return json(res, 200, { events: stores.events.getAll() });
}

export function handleGetMessaging(
  res: ServerResponse,
  stores: DashboardStores,
): boolean {
  return json(res, 200, { messaging: stores.messaging.get() });
}

export async function handlePatchMessaging(
  req: IncomingMessage,
  res: ServerResponse,
  stores: DashboardStores,
): Promise<boolean> {
  let body: Record<string, unknown>;
  try { body = await parseBody(req); } catch { return json(res, 400, { error: "Invalid JSON body" }); }

  const messaging = stores.messaging.update(body as Parameters<typeof stores.messaging.update>[0]);
  stores.events.push("config_changed", "Messaging configuration updated");
  return json(res, 200, { messaging });
}

// --- Telegram Bot API handlers ---

export async function handleTelegramMe(
  res: ServerResponse,
  telegramClient: TelegramClient | null,
): Promise<boolean> {
  if (!telegramClient) return json(res, 503, { error: "Telegram not configured" });
  try {
    const me = await telegramClient.getMe();
    return json(res, 200, { bot: me });
  } catch (err) {
    return json(res, 500, { error: (err as Error).message });
  }
}

export async function handleTelegramGroups(
  res: ServerResponse,
  stores: DashboardStores,
  telegramClient: TelegramClient | null,
): Promise<boolean> {
  if (telegramClient) {
    try {
      const groups = await stores.groups.refreshFromTelegram(telegramClient);
      return json(res, 200, { groups, source: "telegram" });
    } catch {
      // Fall through to stored data
    }
  }
  return json(res, 200, { groups: stores.groups.getAll(), source: "cache" });
}

export async function handleGroupToggle(
  req: IncomingMessage,
  res: ServerResponse,
  stores: DashboardStores,
): Promise<boolean> {
  let body: Record<string, unknown>;
  try { body = await parseBody(req); } catch { return json(res, 400, { error: "Invalid JSON body" }); }
  const chatId = body.chatId as string;
  const enabled = body.enabled as boolean;
  if (!chatId || typeof enabled !== "boolean") return json(res, 400, { error: "chatId and enabled required" });
  const group = stores.groups.setEnabled(chatId, enabled);
  if (!group) return json(res, 404, { error: "Group not found" });
  stores.events.push("config_changed", `Group "${group.chatTitle}" ${enabled ? "enabled" : "disabled"}`);
  return json(res, 200, { group });
}

// --- Agents handler ---

export function handleGetAgents(
  res: ServerResponse,
  stores: DashboardStores,
): boolean {
  return json(res, 200, { agents: stores.events.getSeenAgents() });
}
