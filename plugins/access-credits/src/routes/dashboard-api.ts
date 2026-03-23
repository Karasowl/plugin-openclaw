import type { CreditsStore } from "../store/credits-store.js";
import type { RuntimeStore } from "../store/credits-store.js";
import type { IncomingMessage, ServerResponse } from "http";
import type { TelegramClient } from "../telegram/telegram-api.js";
import {
  handleDashboardPage,
  handleGetConfig,
  handlePatchConfig,
  handleGetTemplates,
  handlePatchTemplates,
  handleGetGroups,
  handleGetEvents,
  handleGetMessaging,
  handlePatchMessaging,
  handleTelegramMe,
  handleTelegramGroups,
  handleGroupToggle,
  handleGetAgents,
  type ConfigContainer,
  type DashboardStores,
} from "../dashboard/api-handlers.js";

interface PluginApi {
  registerHttpRoute(route: {
    path: string;
    auth: string;
    match: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<boolean> | boolean;
  }): void;
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

/**
 * Validate Bearer token from Authorization header or ?token= query param.
 */
function validateToken(req: IncomingMessage, res: ServerResponse, gatewayToken: string): boolean {
  if (!gatewayToken) {
    json(res, 503, { error: "Gateway token not configured" });
    return false;
  }
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const url = new URL(req.url ?? "", "http://localhost");
  const queryToken = url.searchParams.get("token");

  if (bearerToken === gatewayToken || queryToken === gatewayToken) {
    return true;
  }
  json(res, 401, { error: "Unauthorized" });
  return false;
}

function handleUserRoute(
  req: IncomingMessage,
  res: ServerResponse,
  store: CreditsStore,
  pathPrefix: number,
): Promise<boolean> | boolean {
  const url = new URL(req.url ?? "", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const userId = parts[pathPrefix];

  if (!userId) return json(res, 400, { error: "userId is required" });

  const user = store.getUser(userId);
  if (!user) return json(res, 404, { error: "User not found" });

  if (parts[pathPrefix + 1] === "transactions") {
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const transactions = store.getTransactions(userId, limit);
    return json(res, 200, { userId, transactions });
  }

  if (req.method === "POST") {
    return (async () => {
      let body: Record<string, unknown>;
      try { body = await parseBody(req); } catch { return json(res, 400, { error: "Invalid JSON body" }); }

      const amount = body.amount as number;
      const reason = (body.reason as string) ?? "Admin adjustment";
      const action = body.action as string;

      if (typeof amount !== "number" || amount <= 0) return json(res, 400, { error: "amount must be a positive number" });

      if (action === "add") {
        const result = store.addCredits(userId, amount, reason, "admin_add");
        return json(res, 200, { success: true, balance: result.balance });
      } else if (action === "remove") {
        if (amount > user.credits) return json(res, 400, { error: `Cannot remove ${amount}. User has ${user.credits}.` });
        const result = store.addCredits(userId, -amount, reason, "admin_remove");
        return json(res, 200, { success: true, balance: result.balance });
      }
      return json(res, 400, { error: "action must be 'add' or 'remove'" });
    })();
  }

  return json(res, 200, { user });
}

function handleUsersRoute(req: IncomingMessage, res: ServerResponse, store: CreditsStore): boolean {
  const url = new URL(req.url ?? "", "http://localhost");
  let users = store.getAllUsers();
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q) {
    users = users.filter((u) =>
      u.userId.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)),
    );
  }
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
  const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  return json(res, 200, { users: users.slice(offset, offset + limit), total: users.length });
}

export function registerDashboardRoutes(
  api: PluginApi,
  store: CreditsStore,
  configContainer: ConfigContainer,
  rawConfig: Record<string, unknown>,
  runtimeStore: RuntimeStore,
  gatewayToken: string,
  dashboardStores?: DashboardStores,
  telegramClient?: TelegramClient | null,
): void {
  // Dashboard HTML page
  api.registerHttpRoute({
    path: "/plugins/access-credits",
    auth: "plugin",
    match: "exact",
    handler: (req, res) => handleDashboardPage(req, res, configContainer, gatewayToken),
  });
  api.registerHttpRoute({
    path: "/plugins/access-credits/",
    auth: "plugin",
    match: "exact",
    handler: (req, res) => handleDashboardPage(req, res, configContainer, gatewayToken),
  });

  // Health
  api.registerHttpRoute({
    path: "/plugins/access-credits/health",
    auth: "plugin",
    match: "exact",
    handler: (req, res) => {
      if (!validateToken(req, res, gatewayToken)) return true;
      const stats = store.getStats();
      return json(res, 200, {
        version: "0.2.0", mode: configContainer.current.mode, storeStatus: "ok",
        totalUsers: stats.totalUsers, totalCreditsInCirculation: stats.totalCreditsInCirculation,
        totalTransactions: stats.totalTransactions,
      });
    },
  });

  // Stats
  api.registerHttpRoute({
    path: "/plugins/access-credits/stats",
    auth: "plugin",
    match: "exact",
    handler: (req, res) => {
      if (!validateToken(req, res, gatewayToken)) return true;
      return json(res, 200, store.getStats());
    },
  });

  // Users
  api.registerHttpRoute({
    path: "/plugins/access-credits/users",
    auth: "plugin",
    match: "exact",
    handler: (req, res) => {
      if (!validateToken(req, res, gatewayToken)) return true;
      return handleUsersRoute(req, res, store);
    },
  });

  // Config
  api.registerHttpRoute({
    path: "/plugins/access-credits/config",
    auth: "plugin",
    match: "exact",
    handler: async (req, res) => {
      if (!validateToken(req, res, gatewayToken)) return true;
      if (req.method === "PATCH") return handlePatchConfig(req, res, rawConfig, runtimeStore, configContainer);
      return handleGetConfig(res, configContainer);
    },
  });

  // User detail + transactions + adjustment
  api.registerHttpRoute({
    path: "/plugins/access-credits/user",
    auth: "plugin",
    match: "prefix",
    handler: async (req, res) => {
      if (!validateToken(req, res, gatewayToken)) return true;
      return handleUserRoute(req, res, store, 3);
    },
  });

  // --- New routes for dashboard v2 ---

  if (dashboardStores) {
    // Injection templates (GET/PATCH)
    api.registerHttpRoute({
      path: "/plugins/access-credits/prompts",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        if (req.method === "PATCH") return handlePatchTemplates(req, res, dashboardStores);
        return handleGetTemplates(res, dashboardStores);
      },
    });

    // Groups
    api.registerHttpRoute({
      path: "/plugins/access-credits/groups",
      auth: "plugin",
      match: "exact",
      handler: (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        return handleGetGroups(res, dashboardStores);
      },
    });

    // Events
    api.registerHttpRoute({
      path: "/plugins/access-credits/events",
      auth: "plugin",
      match: "exact",
      handler: (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        return handleGetEvents(res, dashboardStores);
      },
    });

    // Messaging
    api.registerHttpRoute({
      path: "/plugins/access-credits/messaging",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        if (req.method === "PATCH") return handlePatchMessaging(req, res, dashboardStores);
        return handleGetMessaging(res, dashboardStores);
      },
    });
  }

  // Telegram Bot API
  if (dashboardStores) {
    api.registerHttpRoute({
      path: "/plugins/access-credits/telegram/me",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        return handleTelegramMe(res, telegramClient ?? null);
      },
    });

    api.registerHttpRoute({
      path: "/plugins/access-credits/telegram/groups",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        return handleTelegramGroups(res, dashboardStores, telegramClient ?? null);
      },
    });

    api.registerHttpRoute({
      path: "/plugins/access-credits/groups/toggle",
      auth: "plugin",
      match: "exact",
      handler: async (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        return handleGroupToggle(req, res, dashboardStores);
      },
    });

    // Agents (auto-detected)
    api.registerHttpRoute({
      path: "/plugins/access-credits/agents",
      auth: "plugin",
      match: "exact",
      handler: (req, res) => {
        if (!validateToken(req, res, gatewayToken)) return true;
        return handleGetAgents(res, dashboardStores);
      },
    });
  }

  // Legacy routes
  api.registerHttpRoute({ path: "/access-credits/users", auth: "plugin", match: "exact",
    handler: async (req, res) => { if (!validateToken(req, res, gatewayToken)) return true; return json(res, 200, { users: store.getAllUsers() }); } });
  api.registerHttpRoute({ path: "/access-credits/stats", auth: "plugin", match: "exact",
    handler: async (req, res) => { if (!validateToken(req, res, gatewayToken)) return true; return json(res, 200, store.getStats()); } });
  api.registerHttpRoute({ path: "/access-credits/user", auth: "plugin", match: "prefix",
    handler: async (req, res) => { if (!validateToken(req, res, gatewayToken)) return true; return handleUserRoute(req, res, store, 2); } });
}
