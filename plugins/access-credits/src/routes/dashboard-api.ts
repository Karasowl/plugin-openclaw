import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import type { IncomingMessage, ServerResponse } from "http";

interface PluginApi {
  registerHttpRoute(route: {
    path: string;
    auth: string;
    match: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
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

export function registerDashboardRoutes(
  api: PluginApi,
  store: CreditsStore,
  _config: AccessCreditsConfig,
): void {
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
    handler: async (_req, res) => {
      const stats = store.getStats();
      return json(res, 200, stats);
    },
  });

  api.registerHttpRoute({
    path: "/access-credits/user",
    auth: "plugin",
    match: "prefix",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const parts = url.pathname.split("/").filter(Boolean);
      // /access-credits/user/:userId[/transactions]
      const userId = parts[2];

      if (!userId) {
        return json(res, 400, { error: "userId is required" });
      }

      const user = store.getUser(userId);
      if (!user) {
        return json(res, 404, { error: "User not found" });
      }

      if (parts[3] === "transactions") {
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
        const transactions = store.getTransactions(userId, limit);
        return json(res, 200, { userId, transactions });
      }

      if (req.method === "POST") {
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
      }

      return json(res, 200, { user });
    },
  });
}
