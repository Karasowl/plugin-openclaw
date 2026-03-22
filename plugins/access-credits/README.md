# @isma/openclaw-plugin-access-credits

Credit-based access control for OpenClaw bots. Rate limit bot usage per user with a points system. Users earn credits by contributing valuable content. Includes message interception middleware, usage metering, group management, and admin tools.

## What it does

This plugin sits between your users and the OpenClaw bot, controlling who can interact based on a credit system:

- Users get initial credits when they first interact
- Each bot interaction costs credits
- Users can earn credits by contributing valuable content (evaluated by the bot)
- Admins can manage credits via HTTP API or bot tools
- Works with any channel: Telegram, WhatsApp, Discord, etc.

## How blocking works (4-layer defense-in-depth)

OpenClaw hooks are observational and cannot directly block messages. This plugin uses a 4-layer strategy:

| Layer | Hook | Type | What it does |
|-------|------|------|-------------|
| 0 | `message:received` | Soft | Detects no-credit users, sends immediate "no credits" response + enforces cooldown |
| 1 | `before_prompt_build` | Soft | Injects "DO NOT respond" instruction into system prompt |
| 2 | `before_tool_call` | **Hard** | Blocks ALL tool calls if user has no credits |
| 3 | `message_sending` | **Hard** | Replaces bot response with "no credits" message |
| 4 | `before_model_resolve` | Cost reduction | Redirects to cheapest model to minimize wasted tokens |

Layers 2 and 3 are hard blocks. Even if the model ignores the prompt instruction (Layer 1), it can't execute tools and its response gets replaced before reaching the user.

## Installation

```bash
# Development (local link)
openclaw --profile dev plugins install -l ./plugins/access-credits

# From npm (once published)
openclaw plugins install @isma/openclaw-plugin-access-credits
```

## Configuration

Add to your OpenClaw config:

```json5
{
  plugins: {
    "access-credits": {
      // "observe" = only log activity, no blocking. "enforce" = full credit gate.
      mode: "enforce",

      // Credits given to new users on first interaction
      initialCredits: 10,

      // Credits deducted per bot interaction
      costPerMessage: 1,

      // Only messages containing these triggers are credit-gated
      triggerHashtags: ["#ask", "#bot"],
      triggerCommands: ["/ask", "/bot"],

      // User IDs that bypass all credit checks
      adminUsers: ["your-telegram-id"],

      // Model to use when user has no credits (minimizes token cost)
      fallbackModel: "cheapest",

      // Bot evaluates if user messages are valuable contributions
      evaluateContributions: true,

      // Credits awarded for a valuable contribution
      contributionReward: 2,

      // Minimum message length to evaluate for contributions (avoids wasting tokens)
      contributionMinLength: 100,

      // Minimum seconds between bot interactions per user (0 = no cooldown)
      // This is a hard gate independent of LLM compliance
      cooldownSeconds: 0,
    }
  }
}
```

## Recommended: Start in observe mode

Before enforcing credits, run in `observe` mode first:

```json5
{ plugins: { "access-credits": { mode: "observe" } } }
```

This logs all activity without blocking anyone. Use the HTTP API to see usage patterns and calibrate your credit values before switching to `enforce`.

## Bot tools

The plugin registers 2 tools that the bot can use:

| Tool | Description |
|------|-------------|
| `access_credits_check_balance` | Check a user's credit balance |
| `access_credits_award` | Award credits for valuable contributions |

Credits are **deducted automatically** by the runtime (Layer 3, `message_sending` hook) — there is no deduct tool exposed to the model, which prevents double-charging.

The bot is instructed (via prompt injection) to:
1. Evaluate messages longer than `contributionMinLength` for intellectual value
2. Award credits for genuine contributions

## Web dashboard

The plugin includes an embedded web dashboard at `/plugins/access-credits/`. No extra setup — it ships inside the plugin bundle.

- **Overview**: total users, credits in circulation, transactions, health status
- **Users**: searchable, paginated user list with credit adjustment
- **Config**: edit all settings live (changes apply on next message, no restart needed)

## HTTP API

### Gateway routes (primary)

These routes are served under `/plugins/access-credits/*` with `auth: "gateway"`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/plugins/access-credits/` | Web dashboard |
| GET | `/plugins/access-credits/health` | Plugin health check |
| GET | `/plugins/access-credits/stats` | Usage statistics |
| GET | `/plugins/access-credits/users?offset=0&limit=50&q=` | Users (paginated, searchable) |
| GET | `/plugins/access-credits/config` | Current configuration |
| PATCH | `/plugins/access-credits/config` | Update configuration (validated) |
| GET | `/plugins/access-credits/user/:userId` | User details |
| GET | `/plugins/access-credits/user/:userId/transactions` | Transaction history |
| POST | `/plugins/access-credits/user/:userId` | Add/remove credits |

### Legacy routes

The original `/access-credits/*` routes (with `auth: "plugin"`) are still available for backward compatibility:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/access-credits/users` | List all users |
| GET | `/access-credits/stats` | Usage statistics |
| GET/POST | `/access-credits/user/:userId` | User details / adjust credits |
| GET | `/access-credits/user/:userId/transactions` | Transaction history |

### Add credits example

```bash
curl -X POST http://localhost:PORT/plugins/access-credits/user/USER_ID \
  -H "Content-Type: application/json" \
  -d '{"action": "add", "amount": 10, "reason": "Manual top-up"}'
```

## Known limitations

- **Not a hard pipeline block**: OpenClaw does not yet support canceling agent sessions from hooks. The 4-layer strategy is defense-in-depth, not a perfect firewall. Layers 2+3 are hard blocks, but some tokens are still consumed.
- **Persistence**: Uses `createPluginRuntimeStore` for data storage. If this API changes, a SQLite fallback may be needed.
- **Contribution evaluation cost**: The bot uses tokens to evaluate contributions. The `contributionMinLength` setting helps avoid evaluating short messages.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```
