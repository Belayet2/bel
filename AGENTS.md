# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now includes a small reversible plugin runtime and typed tool registry, and it has a filesystem capability plugin that can safely read, write, copy, move, delete, list, glob, and grep within the current workspace. This is the first real tool family and follows the plugin-based architecture that later tools will share.

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Architecture direction

Bel keeps a small application structure:

- `src/runtime` — runtime contracts and orchestration
- `src/plugins` — self-contained capabilities
- `src/tools` — tool contracts, registry, and execution boundary
- `src/services` — filesystem, shell, persistence, and other services
- `src/db` — SQLite storage
- `src/llm` — provider abstractions and OpenRouter
- `src/ui` — web presentation
- `src/shared` — shared domain types and utilities

Plugins receive a narrow context, register their tools, and return cleanup functions. This is inspired by DeepSeek Harness's plugin philosophy and capability seams, but Bel stays intentionally smaller and easier to understand.

## Inspiration

Bel takes architectural inspiration from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), especially its separation of plugin-owned capabilities, tool registration, durable session events, and UI projections. Bel keeps the same ideas but uses a simpler local interface so each tool remains easy to copy into another project.
