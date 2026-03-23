import * as fs from "node:fs";
import * as path from "node:path";
import type { RuntimeStore } from "./credits-store.js";

const FILE_NAME = "access-credits-state.json";

export interface PersistenceLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
}

/**
 * Creates a RuntimeStore backed by a JSON file on disk.
 * - get() reads from an in-memory cache (instant, sync)
 * - set() updates the cache and schedules a non-blocking disk write
 * - Writes are coalesced: multiple set() calls in the same tick produce one write
 * - Writes are async (fs.promises) to avoid blocking the event loop
 * - On creation, loads existing data from disk (survives restarts)
 * - Corrupt files are backed up and logged, not silently dropped
 */
export function createFileBackedStore(stateDir: string, logger?: PersistenceLogger): RuntimeStore {
  const filePath = path.join(stateDir, FILE_NAME);

  let cache: Record<string, unknown> = loadFromDisk(filePath, logger);
  let flushScheduled = false;
  let writeChain = Promise.resolve();

  function scheduleFlush(): void {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      // Serialize writes to avoid concurrent tmp file conflicts
      writeChain = writeChain
        .then(() => writeToDiskAsync(filePath, cache))
        .catch((err) => {
          logger?.warn(`[access-credits] Failed to persist state: ${err}`);
        });
    });
  }

  return {
    get(key: string): unknown {
      return cache[key];
    },
    set(key: string, value: unknown): void {
      cache[key] = value;
      scheduleFlush();
    },
  };
}

function loadFromDisk(filePath: string, logger?: PersistenceLogger): Record<string, unknown> {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    // File doesn't exist yet — normal on first run
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    logger?.warn(`[access-credits] State file has unexpected shape (not an object) — starting fresh`);
  } catch (err) {
    logger?.warn(`[access-credits] State file is corrupt — backing up and starting fresh: ${err}`);
    // Backup the corrupt file so data isn't silently lost
    try {
      const backupPath = filePath + `.corrupt.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      logger?.info(`[access-credits] Corrupt state backed up to ${backupPath}`);
    } catch {
      // If backup fails, we still proceed — but the warning above was logged
    }
  }

  return {};
}

async function writeToDiskAsync(filePath: string, data: Record<string, unknown>): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmp = filePath + ".tmp";
  await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.promises.rename(tmp, filePath);
}
