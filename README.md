# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now includes a small reversible plugin runtime, a typed tool registry, a filesystem capability plugin with workspace protections, and a shell/process tool layer for running commands, background jobs, and job output inspection. These capabilities are intentionally kept small and self-contained, so they are easy to copy into another project.

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

Plugins receive a narrow context, register their tools, and return cleanup functions. The shell service keeps command execution and background job tracking in one place so the runtime remains understandable.

## Inspiration

Bel takes architectural inspiration from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), especially its separation of plugin-owned capabilities, tool registration, durable session events, and UI projections. Bel keeps the same ideas but uses a simpler local interface so each capability remains easy to copy into another project.
