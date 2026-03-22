import type { IncomingMessage, ServerResponse } from "http";
import type { CreditsStore, RuntimeStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import type { PromptsStore } from "../store/prompts-store.js";
import type { GroupsStore } from "../store/groups-store.js";
import type { EventsStore } from "../store/events-store.js";
import type { MessagingStore } from "../store/messaging-store.js";
import { resolveConfig } from "../config.js";
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
  const merged = { ...existing, ...validation.sanitized };
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

export function handleGetPrompts(
  res: ServerResponse,
  stores: DashboardStores,
): boolean {
  return json(res, 200, { prompts: stores.prompts.getAll() });
}

export async function handlePromptRoute(
  req: IncomingMessage,
  res: ServerResponse,
  stores: DashboardStores,
  promptId: string,
  subPath: string | undefined,
): Promise<boolean> {
  if (subPath === "history") {
    return json(res, 200, { versions: stores.prompts.getHistory(promptId) });
  }

  if (subPath === "deploy" && req.method === "POST") {
    const prompt = stores.prompts.deploy(promptId);
    if (!prompt) return json(res, 404, { error: "Prompt not found" });
    stores.events.push("prompt_deployed", `Prompt "${prompt.name}" v${prompt.version} deployed`);
    return json(res, 200, { prompt });
  }

  if (req.method === "PATCH") {
    let body: Record<string, unknown>;
    try { body = await parseBody(req); } catch { return json(res, 400, { error: "Invalid JSON body" }); }
    const prompt = stores.prompts.update(promptId, body as Parameters<typeof stores.prompts.update>[1]);
    if (!prompt) return json(res, 404, { error: "Prompt not found" });
    return json(res, 200, { prompt });
  }

  const prompt = stores.prompts.getById(promptId);
  if (!prompt) return json(res, 404, { error: "Prompt not found" });
  return json(res, 200, { prompt });
}

export async function handleCreatePrompt(
  req: IncomingMessage,
  res: ServerResponse,
  stores: DashboardStores,
): Promise<boolean> {
  let body: Record<string, unknown>;
  try { body = await parseBody(req); } catch { return json(res, 400, { error: "Invalid JSON body" }); }

  const name = body.name as string;
  const type = body.type as "pre_interaction" | "post_interaction";
  if (!name || !type) return json(res, 400, { error: "name and type are required" });

  const prompt = stores.prompts.create({
    name,
    type,
    content: (body.content as string) || "",
    modelContext: (body.modelContext as string) || "Claude 3.5 Sonnet",
    temperature: typeof body.temperature === "number" ? body.temperature : 0.7,
  });

  stores.events.push("prompt_deployed", `Prompt "${prompt.name}" created`);
  return json(res, 201, { prompt });
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
