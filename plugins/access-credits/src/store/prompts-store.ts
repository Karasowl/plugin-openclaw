import type { RuntimeStore } from "./credits-store.js";
import type { SystemPrompt, PromptVersion } from "./types.js";

const STORE_KEY = "ac:prompts";
const HISTORY_KEY = "ac:prompt-history";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface PromptsStore {
  getAll(): SystemPrompt[];
  getById(id: string): SystemPrompt | null;
  create(data: Omit<SystemPrompt, "id" | "version" | "isActive" | "deployedAt" | "createdAt" | "updatedAt">): SystemPrompt;
  update(id: string, patch: Partial<Pick<SystemPrompt, "name" | "content" | "modelContext" | "temperature">>): SystemPrompt | null;
  deploy(id: string): SystemPrompt | null;
  getHistory(id: string): PromptVersion[];
  remove(id: string): boolean;
}

export function createPromptsStore(runtimeStore: RuntimeStore): PromptsStore {
  function getData(): SystemPrompt[] {
    const raw = runtimeStore.get(STORE_KEY) as SystemPrompt[] | undefined;
    return raw ?? [];
  }
  function saveData(prompts: SystemPrompt[]): void {
    runtimeStore.set(STORE_KEY, prompts);
  }
  function getHistoryData(): Record<string, PromptVersion[]> {
    const raw = runtimeStore.get(HISTORY_KEY) as Record<string, PromptVersion[]> | undefined;
    return raw ?? {};
  }
  function saveHistoryData(history: Record<string, PromptVersion[]>): void {
    runtimeStore.set(HISTORY_KEY, history);
  }

  return {
    getAll(): SystemPrompt[] {
      return getData();
    },

    getById(id: string): SystemPrompt | null {
      return getData().find((p) => p.id === id) ?? null;
    },

    create(data) {
      const prompts = getData();
      const now = new Date().toISOString();
      const prompt: SystemPrompt = {
        ...data,
        id: generateId(),
        version: 1,
        isActive: false,
        deployedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      prompts.push(prompt);
      saveData(prompts);

      // Initial version history entry
      const history = getHistoryData();
      history[prompt.id] = [{ version: 1, content: data.content, deployedAt: null, createdAt: now }];
      saveHistoryData(history);

      return prompt;
    },

    update(id, patch) {
      const prompts = getData();
      const idx = prompts.findIndex((p) => p.id === id);
      if (idx === -1) return null;

      const prompt = prompts[idx];
      const now = new Date().toISOString();
      if (patch.name !== undefined) prompt.name = patch.name;
      if (patch.content !== undefined) prompt.content = patch.content;
      if (patch.modelContext !== undefined) prompt.modelContext = patch.modelContext;
      if (patch.temperature !== undefined) prompt.temperature = patch.temperature;

      prompt.version += 1;
      prompt.updatedAt = now;
      saveData(prompts);

      // Append version history
      const history = getHistoryData();
      if (!history[id]) history[id] = [];
      history[id].push({ version: prompt.version, content: prompt.content, deployedAt: null, createdAt: now });
      saveHistoryData(history);

      return prompt;
    },

    deploy(id) {
      const prompts = getData();
      const idx = prompts.findIndex((p) => p.id === id);
      if (idx === -1) return null;

      const now = new Date().toISOString();
      // Deactivate all prompts of same type
      const promptType = prompts[idx].type;
      for (const p of prompts) {
        if (p.type === promptType) p.isActive = false;
      }
      prompts[idx].isActive = true;
      prompts[idx].deployedAt = now;
      prompts[idx].updatedAt = now;
      saveData(prompts);

      // Mark version as deployed in history
      const history = getHistoryData();
      const versions = history[id];
      if (versions && versions.length > 0) {
        versions[versions.length - 1].deployedAt = now;
        saveHistoryData(history);
      }

      return prompts[idx];
    },

    getHistory(id) {
      const history = getHistoryData();
      return (history[id] ?? []).slice().reverse();
    },

    remove(id) {
      const prompts = getData();
      const idx = prompts.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      prompts.splice(idx, 1);
      saveData(prompts);
      return true;
    },
  };
}
