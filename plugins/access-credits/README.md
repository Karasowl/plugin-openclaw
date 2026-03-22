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
| 0 | `message:received` | Soft + deduction | Detects no-credit users, deducts credits at admission, enforces cooldown |
| 1 | `before_prompt_build` | Soft | Injects "DO NOT respond" instruction into system prompt |
| 2 | `before_tool_call` | **Hard** | Blocks ALL tool calls if user has no credits |
| 3 | `message_sending` | **Hard** | Replaces bot response with denial message if session was denied |
| 4 | `before_model_resolve` | Cost reduction | Redirects to cheapest model to minimize wasted tokens |

Layers 2 and 3 are hard blocks. Even if the model ignores the prompt instruction (Layer 1), it can't execute tools and its response gets replaced before reaching the user.

Credit deduction happens at Layer 0 (`message:received`) where the plugin has the real `sessionKey` for accurate per-session tracking.

## Installation

### Prerequisites

- [OpenClaw](https://openclaw.dev) gateway running (>= 2026.3.0)
- Node.js >= 18
- pnpm (recommended) or npm

### Build the plugin

```bash
cd plugins/access-credits

# Install dependencies
pnpm install

# Build
pnpm build
```

This produces `dist/index.js` (~109 kB).

### Install in OpenClaw

```bash
# Development (local link — changes apply on rebuild)
openclaw --profile dev plugins install -l ./plugins/access-credits

# From npm (once published)
openclaw plugins install @isma/openclaw-plugin-access-credits
```

### Configure

Add to your OpenClaw config file (`openclaw.config.json5` or equivalent):

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

### Verify installation

1. Start (or restart) the OpenClaw gateway
2. Check the gateway logs for:
   ```
   [access-credits] State persisted to /path/to/.openclaw
   ```
3. Open the dashboard: `http://localhost:PORT/plugins/access-credits/`
4. Send a test message with a trigger (e.g. `#ask hello`) from a non-admin user

## Testing

### Run all tests

```bash
cd plugins/access-credits

# Run tests (119 tests across 6 test files)
pnpm test

# Type check
pnpm typecheck

# Both + build
pnpm typecheck && pnpm test && pnpm build
```

### Manual integration test

After installing in OpenClaw:

1. **Observe mode first** — start with `mode: "observe"` to see activity without blocking
2. **Send a triggered message** — e.g. `#ask what is AI?` from Telegram/WhatsApp
3. **Check the dashboard** — verify the user appears with credits deducted
4. **Restart the gateway** — verify credits survive (file persistence)
5. **Switch to enforce mode** — change config to `mode: "enforce"`
6. **Drain credits** — send messages until credits run out
7. **Verify blocking** — the bot should respond with "No tienes créditos suficientes"
8. **Admin bypass** — add your user ID to `adminUsers`, verify you can still interact

### Test file overview

| File | Tests | What it covers |
|------|-------|---------------|
| `hooks.test.ts` | Message gate, model gate, prompt injection, tool gate, message sending gate, session reuse, FIFO queue |
| `credits-store.test.ts` | Credit operations, deduction, user management, transactions |
| `config-store.test.ts` | Config loading, runtime overrides, validation |
| `cooldown.test.ts` | Cooldown enforcement, timing |
| `file-persistence.test.ts` | Disk persistence, corrupt file handling, async writes, write errors |
| `contribution.test.ts` | Contribution evaluation, reward logic |

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

Credits are **deducted automatically** at admission time (`message:received` hook) — there is no deduct tool exposed to the model, which prevents double-charging.

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

## Persistence

State is persisted to disk as JSON at the directory returned by `api.runtime.state.resolveStateDir()` (typically `~/.openclaw/`).

- **File**: `access-credits-state.json`
- **Writes**: async and coalesced — multiple `set()` calls in the same tick produce one disk write
- **Reads**: from in-memory cache (instant, sync)
- **Corrupt files**: backed up as `.corrupt.{timestamp}` with a warning log, then starts fresh
- **Fallback**: if `resolveStateDir()` returns empty, uses in-memory store (logs warning)
- **Cooldown tracking**: in-memory only (resets on restart — intentional)

## Known limitations

- **Not a hard pipeline block**: OpenClaw does not yet support canceling agent sessions from hooks. The 4-layer strategy is defense-in-depth, not a perfect firewall. Layers 2+3 are hard blocks, but some tokens are still consumed.
- **FIFO bridge for denial messages**: The `message_sending` hook does not receive `sessionKey` from OpenClaw. Denial content replacement uses a FIFO bridge. If two responses for the same user in the same conversation arrive out of order, the denial message type could be swapped (cooldown vs no-credits). Billing is unaffected — credits are deducted at admission with the real `sessionKey`.
- **Contribution evaluation cost**: The bot uses tokens to evaluate contributions. The `contributionMinLength` setting helps avoid evaluating short messages.

## Development

```bash
cd plugins/access-credits

# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```
