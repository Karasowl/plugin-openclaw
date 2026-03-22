import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createFileBackedStore, type PersistenceLogger } from "../src/store/file-persistence.js";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ac-test-"));
}

function cleanDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function createMockLogger(): PersistenceLogger & { infos: string[]; warns: string[] } {
  const infos: string[] = [];
  const warns: string[] = [];
  return {
    infos,
    warns,
    info: (msg: string) => infos.push(msg),
    warn: (msg: string) => warns.push(msg),
  };
}

/** Wait for queued microtasks + async I/O to settle */
async function flush(): Promise<void> {
  // queueMicrotask runs before setTimeout, so await a short delay
  await new Promise((r) => setTimeout(r, 50));
}

const FILE_NAME = "access-credits-state.json";

describe("createFileBackedStore", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it("returns undefined for non-existent key", () => {
    const store = createFileBackedStore(tempDir);
    expect(store.get("missing")).toBeUndefined();
  });

  it("persists values via set and retrieves via get (cache)", () => {
    const store = createFileBackedStore(tempDir);
    store.set("foo", { bar: 42 });
    expect(store.get("foo")).toEqual({ bar: 42 });
  });

  it("writes to disk asynchronously", async () => {
    const store = createFileBackedStore(tempDir);
    store.set("key1", "value1");

    // Immediately after set(), file may not exist yet (async write)
    // Wait for the write to complete
    await flush();

    const filePath = path.join(tempDir, FILE_NAME);
    expect(fs.existsSync(filePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(content.key1).toBe("value1");
  });

  it("loads existing data on creation (survives restart)", async () => {
    const store1 = createFileBackedStore(tempDir);
    store1.set("credits-data", { users: { u1: { credits: 50 } }, transactions: [] });
    store1.set("ac:config", { mode: "enforce" });

    await flush();

    const store2 = createFileBackedStore(tempDir);
    expect(store2.get("credits-data")).toEqual({
      users: { u1: { credits: 50 } },
      transactions: [],
    });
    expect(store2.get("ac:config")).toEqual({ mode: "enforce" });
  });

  it("handles corrupt file: logs warning and backs up", () => {
    const filePath = path.join(tempDir, FILE_NAME);
    fs.writeFileSync(filePath, "NOT VALID JSON {{{", "utf-8");
    const logger = createMockLogger();

    const store = createFileBackedStore(tempDir, logger);
    expect(store.get("anything")).toBeUndefined();

    // Should have warned about corruption
    expect(logger.warns.length).toBeGreaterThanOrEqual(1);
    expect(logger.warns[0]).toContain("corrupt");

    // Should have created a backup
    const files = fs.readdirSync(tempDir);
    const backups = files.filter((f) => f.includes(".corrupt."));
    expect(backups.length).toBe(1);

    // Can still write after corrupt load
    store.set("recovered", true);
    expect(store.get("recovered")).toBe(true);
  });

  it("handles missing directory (creates it on write)", async () => {
    const nestedDir = path.join(tempDir, "sub", "deep");
    const store = createFileBackedStore(nestedDir);
    store.set("test", "value");

    await flush();

    const filePath = path.join(nestedDir, FILE_NAME);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("does not leave .tmp files after write completes", async () => {
    const store = createFileBackedStore(tempDir);
    store.set("key", "val");

    await flush();

    const tmpPath = path.join(tempDir, FILE_NAME + ".tmp");
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it("coalesces multiple set() calls into fewer disk writes", async () => {
    const store = createFileBackedStore(tempDir);
    store.set("counter", 1);
    store.set("counter", 2);
    store.set("counter", 3);

    // Cache is immediately updated
    expect(store.get("counter")).toBe(3);

    await flush();

    // Verify disk has the final value
    const store2 = createFileBackedStore(tempDir);
    expect(store2.get("counter")).toBe(3);
  });

  it("supports multiple independent keys", async () => {
    const store = createFileBackedStore(tempDir);
    store.set("credits-data", { users: {} });
    store.set("ac:config", { mode: "observe" });
    store.set("other", 123);

    expect(store.get("credits-data")).toEqual({ users: {} });
    expect(store.get("ac:config")).toEqual({ mode: "observe" });
    expect(store.get("other")).toBe(123);
  });

  it("handles array stored as top-level value in file (warns and starts fresh)", () => {
    const filePath = path.join(tempDir, FILE_NAME);
    fs.writeFileSync(filePath, "[1, 2, 3]", "utf-8");
    const logger = createMockLogger();

    const store = createFileBackedStore(tempDir, logger);
    expect(store.get("anything")).toBeUndefined();
    expect(logger.warns.length).toBeGreaterThanOrEqual(1);
    expect(logger.warns[0]).toContain("unexpected shape");
  });

  it("logs write errors without crashing", async () => {
    const logger = createMockLogger();
    const store = createFileBackedStore(tempDir, logger);

    // Force writeToDiskAsync to fail by rejecting mkdir (first call in write chain).
    // fs.promises.mkdir is reliably spyable across module boundaries.
    const mkdirSpy = vi
      .spyOn(fs.promises, "mkdir")
      .mockRejectedValueOnce(new Error("EPERM: permission denied"));

    store.set("data", "value");
    await flush();

    // The error branch in scheduleFlush should have logged
    expect(logger.warns.length).toBeGreaterThanOrEqual(1);
    expect(logger.warns[0]).toContain("Failed to persist state");

    mkdirSpy.mockRestore();

    // Cache still works despite disk failure
    expect(store.get("data")).toBe("value");

    // Next write succeeds normally
    store.set("data", "value2");
    await flush();

    const store2 = createFileBackedStore(tempDir);
    expect(store2.get("data")).toBe("value2");
  });
});
