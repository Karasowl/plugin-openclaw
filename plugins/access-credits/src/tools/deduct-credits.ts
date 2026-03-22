import type { CreditsStore } from "../store/credits-store.js";

export function createDeductCreditsTool(store: CreditsStore) {
  return {
    name: "access_credits_deduct",
    description:
      "Deduct credits from a user after processing their request. Call this after responding to a credit-gated interaction.",
    parameters: {
      type: "object" as const,
      properties: {
        userId: {
          type: "string" as const,
          description: "The user ID to deduct credits from",
        },
        amount: {
          type: "number" as const,
          description: "Number of credits to deduct",
        },
        reason: {
          type: "string" as const,
          description: "Reason for the deduction (e.g., 'bot interaction')",
        },
      },
      required: ["userId", "amount", "reason"],
    },
    async execute(
      _sessionId: string,
      params: { userId: string; amount: number; reason: string },
    ) {
      const result = store.deductCredits(params.userId, params.amount, params.reason);

      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to deduct credits. User "${params.userId}" has insufficient balance: ${result.balance} credits.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Deducted ${params.amount} credit(s) from "${params.userId}". New balance: ${result.balance}.`,
          },
        ],
      };
    },
  };
}
