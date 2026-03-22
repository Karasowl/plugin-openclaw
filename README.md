# isma-openclaw-plugins

Monorepo of community OpenClaw plugins by [@isma](https://github.com/isma). Each plugin is independently publishable on npm and installable into any OpenClaw instance.

## Plugins

### [@isma/openclaw-plugin-access-credits](./plugins/access-credits/)

Credit-based access control for OpenClaw bots. Rate limit bot usage per user with a points system.

- Users get initial credits, spend them per interaction
- Earn credits by contributing valuable content (bot-evaluated)
- 4-layer defense-in-depth blocking (2 hard gates + 2 soft gates)
- Observe mode for calibrating before enforcing
- Cooldown rate limiting independent of LLM
- Admin HTTP API for managing credits
- Works with Telegram, WhatsApp, Discord, and any OpenClaw channel

```bash
openclaw plugins install @isma/openclaw-plugin-access-credits
```

## Development

```bash
# Install all dependencies
pnpm install

# Run all tests
pnpm test

# Type check all plugins
pnpm typecheck

# Build all plugins
pnpm build
```

## Adding a new plugin

1. Create a new directory under `plugins/`
2. Add `openclaw.plugin.json`, `package.json`, `tsconfig.json`, `vite.config.ts`
3. Implement with `definePluginEntry` from `openclaw/plugin-sdk/core`
4. Add tests under `tests/`

## Architecture

```
isma-openclaw-plugins/
├── plugins/
│   └── access-credits/     # Credit-based access control
├── packages/                # Shared utilities (future)
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json
```

## Internal docs

- [Plugin strategy](./docs/openclaw-plugin-strategy.md)
- [Multi-agent coordination](./sistema_coordinacion.md)
