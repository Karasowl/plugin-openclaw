import type { CreditsStore } from "../store/credits-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionDenied, isSessionTriggered } from "../gate-state.js";

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

/**
 * Layer 4 - Cost reduction
 * Only redirect to cheap model if this session was triggered AND denied.
 */
export function createModelGateHandler(
  _store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
): (event: ModelResolveEvent) => ModelOverride | undefined {
  return (event: ModelResolveEvent): ModelOverride | undefined => {
    if (!isSessionTriggered(event.sessionKey) || !isSessionDenied(event.sessionKey)) {
      return undefined;
    }

    return { model: getConfig().fallbackModel };
  };
}
