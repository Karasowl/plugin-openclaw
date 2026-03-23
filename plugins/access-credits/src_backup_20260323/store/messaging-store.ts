import type { RuntimeStore } from "./credits-store.js";
import type { MessagingConfig } from "./types.js";

const STORE_KEY = "ac:messaging";

const DEFAULT_MESSAGING: MessagingConfig = {
  locale: "en",
  autoDetect: false,
  templates: {
    insufficient_credits: "You don't have enough credits. Your balance: {credit_balance}. You need {cost} to interact, {user_name}.",
    cooldown: "Please wait a moment before sending another query, {user_name}.",
    welcome: "Welcome {user_name}! You have been granted {credit_balance} credits to get started.",
  },
  translateApiUrl: "",
};

export interface MessagingStore {
  get(): MessagingConfig;
  update(patch: Partial<MessagingConfig>): MessagingConfig;
}

export function createMessagingStore(runtimeStore: RuntimeStore): MessagingStore {
  function getData(): MessagingConfig {
    const raw = runtimeStore.get(STORE_KEY) as MessagingConfig | undefined;
    return raw ?? { ...DEFAULT_MESSAGING, templates: { ...DEFAULT_MESSAGING.templates } };
  }
  function saveData(config: MessagingConfig): void {
    runtimeStore.set(STORE_KEY, config);
  }

  return {
    get(): MessagingConfig {
      return getData();
    },

    update(patch) {
      const current = getData();
      if (patch.locale !== undefined) current.locale = patch.locale;
      if (patch.autoDetect !== undefined) current.autoDetect = patch.autoDetect;
      if (patch.templates !== undefined) current.templates = { ...current.templates, ...patch.templates };
      if (patch.translateApiUrl !== undefined) current.translateApiUrl = patch.translateApiUrl;
      saveData(current);
      return current;
    },
  };
}
