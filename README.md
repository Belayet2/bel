# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now includes a plugin runtime, tool registry, filesystem and shell plugins, Git tooling, OpenRouter provider abstraction, and an agent loop that issues tool calls, executes them, and feeds results back into the model until a final answer is reached. The architecture stays intentionally small and easy to reason about.

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
- `src/agent` — agent loop and orchestration
- `src/ui` — web presentation
- `src/shared` — shared domain types and utilities

The data flow remains simple: user prompt → agent loop → LLM → tool plugin → tool result → LLM → final answer.

## Inspiration

Bel takes architectural inspiration from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), especially its separation of plugin-owned capabilities, tool registration, durable session events, and UI projections. Bel intentionally avoids large package splitting and a framework-heavy architecture.
