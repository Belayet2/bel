# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel is beginning with a UI-first vertical slice. The current application is a mock agent workspace; persistence, plugins, tools, OpenRouter, and the agent loop will be added incrementally.

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Architecture direction

Bel will keep a small application structure:

- `src/runtime` — runtime contracts and orchestration
- `src/plugins` — self-contained capabilities
- `src/services` — filesystem, shell, persistence, and other services
- `src/db` — SQLite storage
- `src/llm` — provider abstractions and OpenRouter
- `src/ui` — web presentation
- `src/shared` — shared domain types and utilities

The UI is intentionally separated from runtime implementation details. Durable session data will eventually come from SQLite; presentation-only state remains in the UI.

## Inspiration

The UI follows ideas from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): separate workspace/session navigation from conversation presentation, expose typed contracts, and render durable activity from session events. Bel deliberately avoids DeepSeek Harness's large monorepo and Cordis dependency tree.
