import type { RuntimeStore } from "./credits-store.js";

const STORE_KEY = "ac:injection-templates";

export interface InjectionTemplates {
  denial: string;
  cooldown: string;
  activeUser: string;
  contribution: string;
  promotion: string;
}

const DEFAULT_TEMPLATES: InjectionTemplates = {
  denial:
    '[ACCESS-CREDITS] User "{senderId}" has {balance} credits. ' +
    'They need {cost} credits to interact. ' +
    'DO NOT process their request. Reply ONLY with a brief message ' +
    'telling them they don\'t have enough credits and their current balance is {balance}.',
  cooldown:
    '[ACCESS-CREDITS] User "{senderId}" is on cooldown. ' +
    'DO NOT process their request. Reply ONLY with a brief message ' +
    'telling them to wait a moment before sending another query.',
  activeUser:
    '[ACCESS-CREDITS] User "{senderId}" has {balance} credits. ' +
    'Each interaction costs {cost} credit(s). Credits are deducted automatically.',
  contribution:
    'The user\'s message is {contentLength} characters long. ' +
    'Evaluate if it contains a genuinely valuable intellectual contribution ' +
    '(original insight, helpful knowledge, creative idea, useful resource). ' +
    'If so, use the "access_credits_award" tool to award them {reward} credit(s). ' +
    'Be selective: only reward real contributions, not casual chat or simple questions.',
  promotion: '',
};

export interface PromptsStore {
  getTemplates(): InjectionTemplates;
  updateTemplate(key: keyof InjectionTemplates, value: string): InjectionTemplates;
  updateTemplates(patch: Partial<InjectionTemplates>): InjectionTemplates;
}

export function createPromptsStore(runtimeStore: RuntimeStore): PromptsStore {
  function getData(): InjectionTemplates {
    const raw = runtimeStore.get(STORE_KEY) as Partial<InjectionTemplates> | undefined;
    return { ...DEFAULT_TEMPLATES, ...(raw || {}) };
  }
  function saveData(templates: InjectionTemplates): void {
    runtimeStore.set(STORE_KEY, templates);
  }

  return {
    getTemplates(): InjectionTemplates {
      return getData();
    },

    updateTemplate(key, value) {
      const templates = getData();
      templates[key] = value;
      saveData(templates);
      return templates;
    },

    updateTemplates(patch) {
      const templates = getData();
      for (const key of Object.keys(patch) as (keyof InjectionTemplates)[]) {
        if (patch[key] !== undefined) templates[key] = patch[key];
      }
      saveData(templates);
      return templates;
    },
  };
}
