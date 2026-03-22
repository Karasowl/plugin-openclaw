import type { CreditsStore } from "../store/credits-store.js";
import type { RuntimeStore } from "../store/credits-store.js";
import type { IncomingMessage, ServerResponse } from "http";
import {
  handleDashboardPage,
  handleGetConfig,
  handlePatchConfig,
  handleHealthCheck,
  type ConfigContainer,
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

function handleUserRoute(
  req: IncomingMessage,
  res: ServerResponse,
  store: CreditsStore,
  pathPrefix: number,
): Promise<boolean> | boolean {
  const url = new URL(req.url ?? "", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const userId = parts[pathPrefix];

  if (!userId) {
    return json(res, 400, { error: "userId is required" });
  }

  const user = store.getUser(userId);
  if (!user) {
    return json(res, 404, { error: "User not found" });
  }

  if (parts[pathPrefix + 1] === "transactions") {
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const transactions = store.getTransactions(userId, limit);
    return json(res, 200, { userId, transactions });
  }

  if (req.method === "POST") {
    return (async () => {
      let body: Record<string, unknown>;
      try {
        body = await parseBody(req);
      } catch {
        return json(res, 400, { error: "Invalid JSON body" });
      }

      const amount = body.amount as number;
      const reason = (body.reason as string) ?? "Admin adjustment";
      const action = body.action as string;

      if (typeof amount !== "number" || amount <= 0) {
        return json(res, 400, { error: "amount must be a positive number" });
      }

      if (action === "add") {
        const result = store.addCredits(userId, amount, reason, "admin_add");
        return json(res, 200, { success: true, balance: result.balance });
      } else if (action === "remove") {
        if (amount > user.credits) {
          return json(res, 400, {
            error: `Cannot remove ${amount} credits. User only has ${user.credits}.`,
          });
        }
        const result = store.addCredits(userId, -amount, reason, "admin_remove");
        return json(res, 200, { success: true, balance: result.balance });
      }

      return json(res, 400, { error: "action must be 'add' or 'remove'" });
    })();
  }

  return json(res, 200, { user });
}

function handleUsersRoute(
  req: IncomingMessage,
  res: ServerResponse,
  store: CreditsStore,
): boolean {
  const url = new URL(req.url ?? "", "http://localhost");
  const allUsers = store.getAllUsers();
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
  const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const paginated = allUsers.slice(offset, offset + limit);
  return json(res, 200, { users: paginated, total: allUsers.length });
}

export function registerDashboardRoutes(
  api: PluginApi,
  store: CreditsStore,
  configContainer: ConfigContainer,
  rawConfig: Record<string, unknown>,
  runtimeStore: RuntimeStore,
): void {
  // ============================================================
  // New routes: /plugins/access-credits/* (auth: gateway)
  // ============================================================

  // Dashboard HTML page
  api.registerHttpRoute({
    path: "/plugins/access-credits",
    auth: "gateway",
    match: "exact",
    handler: (_req, res) => handleDashboardPage(res, configContainer),
  });

  api.registerHttpRoute({
    path: "/plugins/access-credits/",
    auth: "gateway",
    match: "exact",
    handler: (_req, res) => handleDashboardPage(res, configContainer),
  });

  // Health check
  api.registerHttpRoute({
    path: "/plugins/access-credits/health",
    auth: "gateway",
    match: "exact",
    handler: (_req, res) => handleHealthCheck(res, store, configContainer),
  });

  // Stats
  api.registerHttpRoute({
    path: "/plugins/access-credits/stats",
    auth: "gateway",
    match: "exact",
    handler: async (_req, res) => json(res, 200, store.getStats()),
  });

  // Users (paginated)
  api.registerHttpRoute({
    path: "/plugins/access-credits/users",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => handleUsersRoute(req, res, store),
  });

  // Config (GET + PATCH)
  api.registerHttpRoute({
    path: "/plugins/access-credits/config",
    auth: "gateway",
    match: "exact",
    handler: async (req, res) => {
      if (req.method === "PATCH") {
        return handlePatchConfig(req, res, rawConfig, runtimeStore, configContainer);
      }
      return handleGetConfig(res, configContainer);
    },
  });

  // User detail + transactions + credit adjustment
  api.registerHttpRoute({
    path: "/plugins/access-credits/user",
    auth: "gateway",
    match: "prefix",
    handler: async (req, res) => {
      // /plugins/access-credits/user/:userId[/transactions]
      return handleUserRoute(req, res, store, 3);
    },
  });

  // ============================================================
  // Legacy routes: /access-credits/* (auth: plugin)
  // ============================================================

  api.registerHttpRoute({
    path: "/access-credits/users",
    auth: "plugin",
    match: "exact",
    handler: async (_req, res) => {
      const users = store.getAllUsers();
      return json(res, 200, { users });
    },
  });

  api.registerHttpRoute({
    path: "/access-credits/stats",
    auth: "plugin",
    match: "exact",
    handler: async (_req, res) => json(res, 200, store.getStats()),
  });

  api.registerHttpRoute({
    path: "/access-credits/user",
    auth: "plugin",
    match: "prefix",
    handler: async (req, res) => {
      // /access-credits/user/:userId[/transactions]
      return handleUserRoute(req, res, store, 2);
    },
  });
}
