import type { RuntimeStore } from "./credits-store.js";
import type { SystemEvent } from "./types.js";

const STORE_KEY = "ac:events";
const MAX_EVENTS = 100;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface EventsStore {
  getAll(limit?: number): SystemEvent[];
  push(type: SystemEvent["type"], description: string, metadata?: Record<string, unknown>): SystemEvent;
}

export function createEventsStore(runtimeStore: RuntimeStore): EventsStore {
  function getData(): SystemEvent[] {
    const raw = runtimeStore.get(STORE_KEY) as SystemEvent[] | undefined;
    return raw ?? [];
  }
  function saveData(events: SystemEvent[]): void {
    runtimeStore.set(STORE_KEY, events);
  }

  return {
    getAll(limit = 50): SystemEvent[] {
      return getData().slice(-limit).reverse();
    },

    push(type, description, metadata) {
      const events = getData();
      const event: SystemEvent = {
        id: generateId(),
        type,
        description,
        timestamp: new Date().toISOString(),
        metadata,
      };
      events.push(event);
      // Ring buffer: keep only the last MAX_EVENTS
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }
      saveData(events);
      return event;
    },
  };
}
