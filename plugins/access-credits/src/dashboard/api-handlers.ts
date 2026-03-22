import type { IncomingMessage, ServerResponse } from "http";
import type { CreditsStore, RuntimeStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { resolveConfig } from "../config.js";
import { validateConfigPatch, loadConfigOverrides, saveConfigOverrides } from "../config-store.js";
import { buildDashboardHtml } from "./html.js";

export interface ConfigContainer {
  current: AccessCreditsConfig;
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
 * Serve the dashboard page.
 * Validates ?token= against the auto-detected gateway token.
 * On success, injects the token into the HTML so the client JS
 * can authenticate API calls via Authorization: Bearer header.
 */
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
    version: "0.1.0",
    mode: configContainer.current.mode,
    storeStatus: "ok",
    totalUsers: stats.totalUsers,
    totalCreditsInCirculation: stats.totalCreditsInCirculation,
    totalTransactions: stats.totalTransactions,
  });
}
