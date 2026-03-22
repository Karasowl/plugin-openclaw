import { createCreditsStore } from "./store/credits-store.js";
import { resolveConfig } from "./config.js";
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
    const config = resolveConfig(rawConfig);
    const runtimeStore = api.getRuntimeStore();
    const store = createCreditsStore(runtimeStore, config.initialCredits);

    // === OBSERVATION LAYER (always active) ===
    // Intercept incoming messages: log activity, check credits, send immediate response
    api.registerHook("message:received", createMessageGateHandler(store, config));

    // === ENFORCEMENT LAYERS (only in "enforce" mode) ===
    if (config.mode === "enforce") {
      // Layer 1 (soft): Inject credit context into system prompt
      api.registerHook("before_prompt_build", createPromptInjectorHandler(store, config));

      // Layer 2 (hard): Block ALL tool calls if user has no credits
      api.registerHook("before_tool_call", createToolGateHandler(store, config));

      // Layer 3 (hard): Cancel/replace outbound message if user has no credits
      api.registerHook("message_sending", createMessageSendingGateHandler(store, config));

      // Layer 4 (cost reduction): Redirect to cheapest model if no credits
      api.registerHook("before_model_resolve", createModelGateHandler(store, config));
    }

    // Register tools for the bot to manage credits
    registerCreditTools(api, store, config);

    // Register HTTP routes for admin dashboard
    registerDashboardRoutes(api as Parameters<typeof registerDashboardRoutes>[0], store, config);
  },
};
