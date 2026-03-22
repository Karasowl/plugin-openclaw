import { describe, it, expect, beforeEach } from "vitest";
import { PassThrough } from "stream";
import { createCreditsStore, type CreditsStore } from "../src/store/credits-store.js";
import { DEFAULT_CONFIG, type AccessCreditsConfig } from "../src/config.js";
import { buildDashboardHtml } from "../src/dashboard/html.js";
import {
  handleDashboardPage,
  handleGetConfig,
  handlePatchConfig,
  handleHealthCheck,
  type ConfigContainer,
} from "../src/dashboard/api-handlers.js";

function createMockRuntimeStore() {
  const data: Record<string, unknown> = {};
  return {
    get: (key: string) => data[key],
    set: (key: string, value: unknown) => {
      data[key] = value;
    },
  };
}

function createMockRes() {
  const res = new PassThrough() as PassThrough & {
    statusCode: number;
    headers: Record<string, string>;
    setHeader: (k: string, v: string) => void;
    body: string;
  };
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k: string, v: string) => {
    res.headers[k.toLowerCase()] = v;
  };

  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => {
    res.body = Buffer.concat(chunks).toString();
  });

  // Override end to capture the body
  const originalEnd = res.end.bind(res);
  res.end = ((data?: unknown) => {
    if (typeof data === "string") {
      res.body = data;
    } else if (Buffer.isBuffer(data)) {
      res.body = data.toString();
    } else {
      res.body = "";
    }
    return originalEnd();
  }) as typeof res.end;

  return res;
}

function createMockReq(method: string, body?: Record<string, unknown>) {
  const req = new PassThrough() as PassThrough & {
    method: string;
    url: string;
  };
  req.method = method;
  req.url = "/";
  if (body) {
    process.nextTick(() => {
      req.end(JSON.stringify(body));
    });
  } else {
    process.nextTick(() => req.end());
  }
  return req;
}

describe("buildDashboardHtml", () => {
  it("returns valid HTML with expected elements", () => {
    const html = buildDashboardHtml(DEFAULT_CONFIG);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Access Credits");
    expect(html).toContain('data-screen');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('id="sidebar"');
    expect(html).toContain("__INITIAL_CONFIG__");
    expect(html).toContain("__API_BASE__");
  });

  it("embeds config as JSON without script injection", () => {
    const config = { ...DEFAULT_CONFIG, fallbackModel: "<script>alert(1)</script>" };
    const html = buildDashboardHtml(config);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("\\u003c");
  });
});

describe("handleDashboardPage", () => {
  it("returns 200 with HTML content type", () => {
    const req = createMockReq("GET");
    (req as Record<string, unknown>).url = "/plugins/access-credits?token=test-token";
    (req as Record<string, unknown>).headers = {};
    const res = createMockRes();
    const container: ConfigContainer = { current: DEFAULT_CONFIG };
    handleDashboardPage(req as never, res as never, container, "test-token");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toContain("<!doctype html>");
  });
});

describe("handleGetConfig", () => {
  it("returns current config as JSON", () => {
    const res = createMockRes();
    const container: ConfigContainer = { current: DEFAULT_CONFIG };
    handleGetConfig(res as never, container);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.config.mode).toBe("enforce");
    expect(body.config.initialCredits).toBe(10);
  });
});

describe("handlePatchConfig", () => {
  let runtimeStore: ReturnType<typeof createMockRuntimeStore>;
  let container: ConfigContainer;
  const rawConfig: Record<string, unknown> = {};

  beforeEach(() => {
    runtimeStore = createMockRuntimeStore();
    container = { current: { ...DEFAULT_CONFIG } };
  });

  it("updates config with valid patch", async () => {
    const req = createMockReq("PATCH", { mode: "observe", costPerMessage: 5 });
    const res = createMockRes();
    await handlePatchConfig(req as never, res as never, rawConfig, runtimeStore, container);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.config.mode).toBe("observe");
    expect(body.config.costPerMessage).toBe(5);
    // Live config updated
    expect(container.current.mode).toBe("observe");
    expect(container.current.costPerMessage).toBe(5);
  });

  it("persists overrides to runtime store", async () => {
    const req = createMockReq("PATCH", { initialCredits: 50 });
    const res = createMockRes();
    await handlePatchConfig(req as never, res as never, rawConfig, runtimeStore, container);
    expect(runtimeStore.get("ac:config")).toEqual({ initialCredits: 50 });
  });

  it("merges with existing overrides", async () => {
    // First patch
    const req1 = createMockReq("PATCH", { mode: "observe" });
    const res1 = createMockRes();
    await handlePatchConfig(req1 as never, res1 as never, rawConfig, runtimeStore, container);

    // Second patch
    const req2 = createMockReq("PATCH", { costPerMessage: 3 });
    const res2 = createMockRes();
    await handlePatchConfig(req2 as never, res2 as never, rawConfig, runtimeStore, container);

    expect(container.current.mode).toBe("observe"); // from first patch
    expect(container.current.costPerMessage).toBe(3); // from second patch
  });

  it("rejects invalid fields", async () => {
    const req = createMockReq("PATCH", { mode: "turbo", costPerMessage: -1 });
    const res = createMockRes();
    await handlePatchConfig(req as never, res as never, rawConfig, runtimeStore, container);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.errors).toHaveLength(2);
    // Config unchanged
    expect(container.current.mode).toBe("enforce");
  });

  it("rejects unknown keys", async () => {
    const req = createMockReq("PATCH", { unknownField: true });
    const res = createMockRes();
    await handlePatchConfig(req as never, res as never, rawConfig, runtimeStore, container);
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const req = new PassThrough() as PassThrough & { method: string; url: string };
    req.method = "PATCH";
    req.url = "/";
    process.nextTick(() => req.end("not json{"));
    const res = createMockRes();
    await handlePatchConfig(req as never, res as never, rawConfig, runtimeStore, container);
    expect(res.statusCode).toBe(400);
  });
});

describe("handleHealthCheck", () => {
  it("returns health info", () => {
    const runtimeStore = createMockRuntimeStore();
    const store = createCreditsStore(runtimeStore, 10);
    store.getOrCreateUser("user-1");
    const container: ConfigContainer = { current: DEFAULT_CONFIG };
    const res = createMockRes();
    handleHealthCheck(res as never, store, container);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.version).toBe("0.2.0");
    expect(body.mode).toBe("enforce");
    expect(body.storeStatus).toBe("ok");
    expect(body.totalUsers).toBe(1);
  });
});
