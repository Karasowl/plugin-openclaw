import type { CreditsStore } from "../store/credits-store.js";

export function createAwardCreditsTool(store: CreditsStore) {
  return {
    name: "access_credits_award",
    description:
      "Award credits to a user for making a valuable intellectual contribution. " +
      "Use this when a user shares original insights, helpful knowledge, creative ideas, or useful resources.",
    parameters: {
      type: "object" as const,
      properties: {
        userId: {
          type: "string" as const,
          description: "The user ID to award credits to",
        },
        amount: {
          type: "number" as const,
          description: "Number of credits to award",
        },
        reason: {
          type: "string" as const,
          description: "Description of the valuable contribution that earned the credits",
        },
      },
      required: ["userId", "amount", "reason"],
    },
    async execute(
      _sessionId: string,
      params: { userId: string; amount: number; reason: string },
    ) {
      const result = store.addCredits(
        params.userId,
        params.amount,
        params.reason,
        "contribution_reward",
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Awarded ${params.amount} credit(s) to "${params.userId}" for: ${params.reason}. New balance: ${result.balance}.`,
          },
        ],
      };
    },
  };
}
