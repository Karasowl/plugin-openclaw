import type { CreditsStore } from "../store/credits-store.js";
import type { PromptsStore } from "../store/prompts-store.js";
import type { EventsStore } from "../store/events-store.js";
import type { AccessCreditsConfig } from "../config.js";
import { isSessionTriggered, isSessionDenied, getDenialReason, getSender } from "../gate-state.js";

interface BeforePromptBuildEvent {
  prompt: string;
  messages: unknown[];
}

interface AgentContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  messageProvider?: string;
  trigger?: string;
  channelId?: string;
}

interface BeforePromptBuildResult {
  appendSystemContext?: string;
}

function interpolate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

export function createPromptInjectorHandler(
  store: CreditsStore,
  getConfig: () => AccessCreditsConfig,
  promptsStore?: PromptsStore,
  eventsStore?: EventsStore,
) {
  return (event: BeforePromptBuildEvent, ctx: AgentContext): BeforePromptBuildResult | void => {
    const config = getConfig();
    if (config.mode === "observe") return;

    // Track agent ID if available
    if (ctx.agentId && eventsStore) {
      eventsStore.trackAgent(ctx.agentId);
    }

    // Agent filtering: skip if this agent isn't in the configured list
    if (config.agentIds?.length > 0 && ctx.agentId && !config.agentIds.includes(ctx.agentId)) {
      return;
    }

    const sessionKey = ctx.sessionKey;
    if (!sessionKey) return;

    if (!isSessionTriggered(sessionKey)) return;

    const senderId = getSender(sessionKey);
    if (!senderId) return;

    if (config.adminUsers.includes(senderId)) return;

    const templates = promptsStore?.getTemplates();

    // If session was denied, inject block instruction
    if (isSessionDenied(sessionKey)) {
      const reason = getDenialReason(sessionKey);

      if (reason === "cooldown") {
        const text = templates?.cooldown
          ? interpolate(templates.cooldown, { senderId })
          : `[ACCESS-CREDITS] User "${senderId}" is on cooldown. DO NOT process their request. Reply ONLY with a brief message telling them to wait a moment before sending another query.`;
        return { appendSystemContext: text };
      }

      const user = store.getUser(senderId);
      const balance = user?.credits ?? 0;
      const text = templates?.denial
        ? interpolate(templates.denial, { senderId, balance: String(balance), cost: String(config.costPerMessage) })
        : `[ACCESS-CREDITS] User "${senderId}" has ${balance} credits. They need ${config.costPerMessage} credits to interact. DO NOT process their request. Reply ONLY with a brief message telling them they don't have enough credits and their current balance is ${balance}.`;
      return { appendSystemContext: text };
    }

    // User has credits — inject context
    const user = store.getUser(senderId);
    if (!user) return;

    const vars = {
      senderId,
      balance: String(user.credits),
      cost: String(config.costPerMessage),
      reward: String(config.contributionReward),
      minLength: String(config.contributionMinLength),
      contentLength: String(event.prompt?.length ?? 0),
    };

    const lines: string[] = [];

    // Active user template
    lines.push(templates?.activeUser
      ? interpolate(templates.activeUser, vars)
      : `[ACCESS-CREDITS] User "${senderId}" has ${user.credits} credits. Each interaction costs ${config.costPerMessage} credit(s). Credits are deducted automatically.`);

    // Contribution evaluation
    if (config.evaluateContributions) {
      const contentLength = event.prompt?.length ?? 0;
      if (contentLength >= config.contributionMinLength) {
        lines.push(templates?.contribution
          ? interpolate(templates.contribution, vars)
          : `The user's message is ${contentLength} characters long. Evaluate if it contains a genuinely valuable intellectual contribution. If so, use the "access_credits_award" tool to award them ${config.contributionReward} credit(s). Be selective: only reward real contributions, not casual chat or simple questions.`);
      }
    }

    // Promotion template (if non-empty)
    if (templates?.promotion) {
      lines.push(interpolate(templates.promotion, vars));
    }

    return { appendSystemContext: lines.join(" ") };
  };
}
