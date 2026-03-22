import type { CreditsStore } from "../store/credits-store.js";

export function createCheckBalanceTool(store: CreditsStore) {
  return {
    name: "access_credits_check_balance",
    description:
      "Check the credit balance of a user. Returns their current credits, total earned, and total spent.",
    parameters: {
      type: "object" as const,
      properties: {
        userId: {
          type: "string" as const,
          description: "The user ID to check credits for",
        },
      },
      required: ["userId"],
    },
    async execute(_sessionId: string, params: { userId: string }) {
      const user = store.getUser(params.userId);

      if (!user) {
        return {
          content: [
            {
              type: "text" as const,
              text: `User "${params.userId}" not found. They haven't interacted with the bot yet.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                userId: user.userId,
                displayName: user.displayName,
                credits: user.credits,
                totalEarned: user.totalEarned,
                totalSpent: user.totalSpent,
                lastActivity: user.lastActivity,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  };
}
