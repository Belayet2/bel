# Bel

Bel is a small, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

The default Bel runtime now mounts shared filesystem, shell, and Git capabilities through a reversible plugin host and typed tool registry. Filesystem and shell services are workspace-scoped and reusable by multiple plugins. The agent loop and durable session runner consume this runtime but remain independent of the UI.

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Architecture

- `src/services` — reusable filesystem, shell, and Git services
- `src/plugins` — capability plugins and lifecycle registration
- `src/tools` — validation, schemas, and structured tool results
- `src/agent` — agent loop, safety, and durable turn orchestration
- `src/db` — SQLite session persistence
- `src/llm` — provider contracts and OpenRouter
- `src/ui` — presentation only

The main flow remains:

`user prompt → agent loop → LLM → tool registry → plugin service → tool result → LLM → final answer`

Bel borrows DeepSeek Harness ideas such as capability seams, reversible registrations, durable session facts, and UI projections, without copying its Cordis framework or large monorepo structure.
