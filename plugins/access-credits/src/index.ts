import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { createCreditsStore } from "./store/credits-store.js";
import { createFileBackedStore } from "./store/file-persistence.js";
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
 * This avoids requiring users to manually copy their token into plugin config.
 */
function detectGatewayToken(log?: { info: (msg: string) => void; warn: (msg: string) => void }): string {
  // Try common locations for openclaw.json
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

    // Persistent store — file-backed JSON via api.runtime.state.resolveStateDir().
    const stateDir = api.runtime.state.resolveStateDir();
    let runtimeStore;
    if (stateDir) {
      runtimeStore = createFileBackedStore(stateDir, log);
      log.info(`[access-credits] State persisted to ${stateDir}`);
    } else {
      log.warn("[access-credits] resolveStateDir() returned empty — using in-memory store (data will be lost on restart)");
      const mem = new Map<string, unknown>();
      runtimeStore = { get: (key: string) => mem.get(key), set: (key: string, value: unknown) => { mem.set(key, value); } };
    }

    const overrides = loadConfigOverrides(runtimeStore);
    const configContainer = { current: resolveConfig(rawConfig, overrides) };
    const getConfig = () => configContainer.current;

    const store = createCreditsStore(runtimeStore, () => configContainer.current.initialCredits);

    // === LAYER 0: Internal hook with name ===
    api.registerHook("message:received", createMessageGateHandler(store, getConfig), {
      name: "access-credits-message-gate"
    });

    // === LAYERS 1-4: Plugin lifecycle hooks ===
    api.on("before_prompt_build", createPromptInjectorHandler(store, getConfig));
    api.on("before_tool_call", createToolGateHandler(store, getConfig));
    api.on("message_sending", createMessageSendingGateHandler(store, getConfig));
    api.on("before_model_resolve", createModelGateHandler(store, getConfig));

    // Register tools for the bot to manage credits
    registerCreditTools(api, store, getConfig);

    // Register HTTP routes for dashboard + API
    registerDashboardRoutes(
      api as Parameters<typeof registerDashboardRoutes>[0],
      store,
      configContainer,
      rawConfig,
      runtimeStore,
      gatewayToken,
    );
  },
};
