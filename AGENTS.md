# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now includes a reversible plugin runtime, typed tool registry, filesystem and shell capabilities, Git tools, and an OpenRouter provider abstraction. Git execution uses argument arrays rather than shell interpolation, while the LLM provider maps Bel's model/tool vocabulary to OpenRouter's chat-completions API. The agent loop is the next major layer.

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

## Inspiration

Bel takes architectural inspiration from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), especially its separation of provider seams, plugin-owned tools, durable session events, and UI projections. Bel keeps the interfaces intentionally small and does not copy DeepSeek Harness's Cordis framework or monorepo structure.

## Security notes

- Git arguments are passed directly to `git`; user input is not interpolated into a shell command.
- `git_commit` is exposed as a tool but should be placed behind approval policy when the agent loop is added.
- OpenRouter API keys must remain in the Node/runtime process and must never be bundled into the browser UI.
