# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now includes a plugin runtime, tool registry, filesystem and shell plugins, Git tooling, OpenRouter provider abstraction, agent loop orchestration, and a simple safety/approval gate. The runtime is intentionally small, and the approval layer blocks risky actions until they are explicitly approved.

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
- `src/agent` — agent loop and safety gates
- `src/ui` — web presentation
- `src/shared` — shared domain types and utilities

The data flow remains simple: user prompt → agent loop → LLM → safety policy → tool plugin → tool result → LLM → final answer.

## Inspiration

Bel takes architectural inspiration from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), especially its separation of plugin-owned capabilities, tool registration, durable session events, and UI projections. Bel intentionally avoids large package splitting and a framework-heavy architecture.
