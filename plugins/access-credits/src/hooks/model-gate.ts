import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";

interface ModelResolveEvent {
  type: string;
  action: string;
  sessionKey: string;
  context: {
    senderId?: string;
    from?: string;
  };
}

interface ModelOverride {
  model?: string;
}

export function createModelGateHandler(
  store: CreditsStore,
  config: AccessCreditsConfig,
): (event: ModelResolveEvent) => ModelOverride | undefined {
  return (event: ModelResolveEvent): ModelOverride | undefined => {
    const senderId = event.context.senderId ?? event.context.from;
    if (!senderId) return undefined;

    if (config.adminUsers.includes(senderId)) return undefined;

    if (!store.hasEnoughCredits(senderId, config.costPerMessage)) {
      return { model: config.fallbackModel };
    }

    return undefined;
  };
}
