import { createCreditsStore } from "./store/credits-store.js";
import { resolveConfig } from "./config.js";
import { loadConfigOverrides } from "./config-store.js";
import { createMessageGateHandler } from "./hooks/message-gate.js";
import { createModelGateHandler } from "./hooks/model-gate.js";
import { createPromptInjectorHandler } from "./hooks/prompt-inject.js";
import { createMessageSendingGateHandler } from "./hooks/message-sending-gate.js";
import { createToolGateHandler } from "./hooks/tool-gate.js";
import { registerCreditTools } from "./tools/index.js";
import { registerDashboardRoutes } from "./routes/dashboard-api.js";

interface PluginApi {
  getConfig(): Record<string, unknown>;
  registerHook(event: string, handler: (event: never) => unknown): void;
  registerTool(tool: unknown): void;
  registerHttpRoute(route: unknown): void;
  getRuntimeStore(): { get: (key: string) => unknown; set: (key: string, value: unknown) => void };
}

export default {
  id: "access-credits",
  name: "Access Credits",
  description:
    "Credit-based access control for OpenClaw bots. " +
    "Rate limit bot usage per user with a points system. " +
    "Users earn credits by contributing valuable content.",

  register(api: PluginApi) {
    const rawConfig = api.getConfig();
    const runtimeStore = api.getRuntimeStore();
    const overrides = loadConfigOverrides(runtimeStore);
    const configContainer = { current: resolveConfig(rawConfig, overrides) };
    const getConfig = () => configContainer.current;

    const store = createCreditsStore(runtimeStore, () => configContainer.current.initialCredits);

    // === OBSERVATION LAYER (always active) ===
    api.registerHook("message:received", createMessageGateHandler(store, getConfig));

    // === ENFORCEMENT LAYERS (only in "enforce" mode) ===
    // Note: mode can change at runtime via dashboard, but hooks are registered once.
    // Each hook checks getConfig().mode internally when relevant.
    api.registerHook("before_prompt_build", createPromptInjectorHandler(store, getConfig));
    api.registerHook("before_tool_call", createToolGateHandler(store, getConfig));
    api.registerHook("message_sending", createMessageSendingGateHandler(store, getConfig));
    api.registerHook("before_model_resolve", createModelGateHandler(store, getConfig));

    // Register tools for the bot to manage credits
    registerCreditTools(api, store, getConfig);

    // Register HTTP routes for dashboard + API
    registerDashboardRoutes(
      api as Parameters<typeof registerDashboardRoutes>[0],
      store,
      configContainer,
      rawConfig,
      runtimeStore,
    );
  },
};
