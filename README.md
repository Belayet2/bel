# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now has a small reversible plugin runtime and typed tool registry on top of the UI and persistence foundations. Tools validate input, return structured errors, and can be registered/unregistered by plugins. The diagnostics `echo` tool is only a pipeline test; real filesystem, shell, and Git tools come later.

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

Plugins receive a small context, register capabilities, and return cleanup functions. This is inspired by DeepSeek Harness's reversible plugin registrations and capability seams, but Bel deliberately avoids its Cordis framework and large workspace structure.

## Inspiration

Bel takes architectural inspiration from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), especially its separation of plugin-owned capabilities, tool registration, durable session events, and UI projections. Bel uses simpler local interfaces so each capability remains easy to copy into another project.
