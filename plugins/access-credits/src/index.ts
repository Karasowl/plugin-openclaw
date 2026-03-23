import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createCreditsStore } from "./store/credits-store.js";
import { createFileBackedStore } from "./store/file-persistence.js";
import { createPromptsStore } from "./store/prompts-store.js";
import { createGroupsStore } from "./store/groups-store.js";
import { createEventsStore } from "./store/events-store.js";
import { createMessagingStore } from "./store/messaging-store.js";
import { createTelegramClient, type TelegramClient } from "./telegram/telegram-api.js";
import { createTranslateService } from "./services/translate.js";
import { resolveConfig } from "./config.js";
import { loadConfigOverrides } from "./config-store.js";
import { createMessageGateHandler } from "./hooks/message-gate.js";
import { createModelGateHandler } from "./hooks/model-gate.js";
import { createPromptInjectorHandler } from "./hooks/prompt-inject.js";
import { createMessageSendingGateHandler } from "./hooks/message-sending-gate.js";
import { createToolGateHandler } from "./hooks/tool-gate.js";
import { registerCreditTools } from "./tools/index.js";
import { registerDashboardRoutes } from "./routes/dashboard-api.js";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Auto-detect the gateway auth token by reading openclaw.json.
 */
function detectGatewayToken(log?: { info: (msg: string) => void; warn: (msg: string) => void }): string {
  const candidates = [
    path.join(process.env.HOME || "", ".openclaw", "openclaw.json"),
    path.join(process.env.USERPROFILE || "", ".openclaw", "openclaw.json"),
  ];

  for (const configPath of candidates) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(raw);
      const token = config?.gateway?.auth?.token;
      if (typeof token === "string" && token.length > 0) {
        log?.info(`[access-credits] Gateway token detected from ${configPath}`);
        return token;
      }
    } catch {
      // File not found or invalid — try next candidate
    }
  }

  log?.warn("[access-credits] Could not auto-detect gateway token — dashboard will be inaccessible");
  return "";
}

/**
 * Try to resolve the Telegram bot token from OpenClaw runtime.
 */
function resolveTelegramClient(
  api: OpenClawPluginApi,
  log: { info: (msg: string) => void; warn: (msg: string) => void },
): TelegramClient | null {
  try {
    const resolve = (api.runtime as Record<string, unknown>)?.channel as Record<string, unknown> | undefined;
    const telegram = resolve?.telegram as Record<string, unknown> | undefined;
    const resolveFn = telegram?.resolveTelegramToken as ((cfg?: unknown, opts?: unknown) => { token: string; source: string }) | undefined;

    if (resolveFn) {
      const result = resolveFn(undefined, {});
      if (result?.token) {
        log.info(`[access-credits] Telegram token resolved (source: ${result.source})`);
        return createTelegramClient(result.token);
      }
    }
  } catch {
    // Not available — expected on non-Telegram setups
  }

  log.warn("[access-credits] Telegram token not available — group discovery disabled");
  return null;
}

export default {
  id: "access-credits",
  name: "Access Credits",
  description:
    "Credit-based access control for OpenClaw bots. " +
    "Rate limit bot usage per user with a points system. " +
    "Users earn credits by contributing valuable content.",

  register(api: OpenClawPluginApi) {
    const rawConfig = (api.pluginConfig ?? {}) as Record<string, unknown>;
    const log = api.logger;

    // Auto-detect gateway token for dashboard auth
    const gatewayToken = detectGatewayToken(log);

    // Persistent store
    const stateDir = api.runtime.state.resolveStateDir();
    let runtimeStore;
    if (stateDir) {
      runtimeStore = createFileBackedStore(stateDir, log);
      log.info(`[access-credits] State persisted to ${stateDir}`);
    } else {
      log.warn("[access-credits] resolveStateDir() returned empty — using in-memory store");
      const mem = new Map<string, unknown>();
      runtimeStore = { get: (key: string) => mem.get(key), set: (key: string, value: unknown) => { mem.set(key, value); } };
    }

    const overrides = loadConfigOverrides(runtimeStore);
    const configContainer = { current: resolveConfig(rawConfig, overrides) };
    const getConfig = () => configContainer.current;

    const store = createCreditsStore(runtimeStore, () => configContainer.current.initialCredits);

    // Dashboard v2 stores
    const promptsStore = createPromptsStore(runtimeStore);
    const groupsStore = createGroupsStore(runtimeStore);
    const eventsStore = createEventsStore(runtimeStore);
    const messagingStore = createMessagingStore(runtimeStore);

    // Discover ALL configured agents from OpenClaw config at startup
    try {
      const agentsList = (api as Record<string, unknown>).config as Record<string, unknown> | undefined;
      const agentsConfig = agentsList?.agents as { list?: Array<{ id: string; name?: string }> } | undefined;
      const configuredAgents = agentsConfig?.list || [];
      for (const agent of configuredAgents) {
        if (agent.id) {
          eventsStore.trackAgent(agent.id);
          log.info(`[access-credits] Discovered agent: ${agent.id}${agent.name ? ` (${agent.name})` : ""}`);
        }
      }
      if (configuredAgents.length > 0) {
        log.info(`[access-credits] Found ${configuredAgents.length} configured agent(s)`);
      }
    } catch {
      log.warn("[access-credits] Could not read agent config — agents will be detected from messages");
    }

    // Discover ALL configured Telegram groups from OpenClaw config at startup
    try {
      const ocConfig = (api as Record<string, unknown>).config as Record<string, unknown> | undefined;
      const channels = ocConfig?.channels as Record<string, unknown> | undefined;
      const telegramCfg = channels?.telegram as Record<string, unknown> | undefined;
      const groupsRecord = telegramCfg?.groups as Record<string, Record<string, unknown>> | undefined;

      if (groupsRecord) {
        const groupIds = Object.keys(groupsRecord);
        for (const chatId of groupIds) {
          if (chatId === "*") continue; // Skip wildcard config
          const groupCfg = groupsRecord[chatId];
          const enabled = groupCfg?.enabled !== false;
          groupsStore.upsert(chatId, "Group " + chatId);
          if (!enabled) groupsStore.setEnabled(chatId, false);
          log.info(`[access-credits] Discovered group: ${chatId} (enabled: ${enabled})`);
        }
        log.info(`[access-credits] Found ${groupIds.filter(g => g !== "*").length} configured group(s)`);
      }
    } catch {
      log.warn("[access-credits] Could not read groups config — groups will be detected from messages");
    }

    // Telegram client (for group discovery + refreshing live data)
    const telegramClient = resolveTelegramClient(api, log);

    // If we have both groups and a Telegram client, refresh group metadata (titles, member counts)
    if (telegramClient && groupsStore.getAll().length > 0) {
      groupsStore.refreshFromTelegram(telegramClient).then((groups) => {
        log.info(`[access-credits] Refreshed ${groups.length} group(s) from Telegram API`);
      }).catch(() => {
        log.warn("[access-credits] Could not refresh groups from Telegram — using config data");
      });
    }

    // Translation service
    const messagingConfig = messagingStore.get();
    const translateService = createTranslateService(messagingConfig.translateApiUrl || undefined);

    // === LAYER 0: Internal hook ===
    api.registerHook("message:received", createMessageGateHandler(store, getConfig, groupsStore, eventsStore), {
      name: "access-credits-message-gate"
    });

    // === LAYERS 1-4: Plugin lifecycle hooks ===
    api.on("before_prompt_build", createPromptInjectorHandler(store, getConfig, promptsStore, eventsStore));
    api.on("before_tool_call", createToolGateHandler(store, getConfig));
    api.on("message_sending", createMessageSendingGateHandler(store, getConfig, messagingStore, translateService));
    api.on("before_model_resolve", createModelGateHandler(store, getConfig));

    // Register tools
    registerCreditTools(api, store, getConfig);

    // Register HTTP routes
    registerDashboardRoutes(
      api as Parameters<typeof registerDashboardRoutes>[0],
      store,
      configContainer,
      rawConfig,
      runtimeStore,
      gatewayToken,
      { prompts: promptsStore, groups: groupsStore, events: eventsStore, messaging: messagingStore },
      telegramClient,
    );
  },
};
