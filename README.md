# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now includes a plugin runtime, typed tool registry, filesystem and shell plugins, Git tooling, OpenRouter provider abstraction, agent-loop orchestration, safety/approval checks, and durable agent-turn persistence. Agent turns now record user/assistant messages, tool outcomes, lifecycle events, and completed/failed session status through a storage interface.

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
- `src/agent` — agent loop, safety, and durable turn orchestration
- `src/ui` — web presentation
- `src/shared` — shared domain types and utilities

The data flow remains simple: user prompt → agent loop → LLM → safety policy → tool plugin → durable tool result → LLM → durable final answer.

## Inspiration

Bel takes architectural inspiration from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), especially its durable session event log, model-visible activity being reconstructable, plugin-owned capabilities, and UI projections. Bel intentionally avoids large package splitting and a framework-heavy architecture.
