# Bel project instructions

## Purpose

Bel is a personal, understandable, plugin-based agent harness. It is inspired by DeepSeek Harness's “everything is a plugin” philosophy but intentionally remains small.

## Current stage

Bel now has a small reversible plugin runtime, a typed tool registry, a filesystem capability plugin, and a shell/process plugin. The project is moving toward the real agent harness architecture: capabilities are registered as small, self-contained plugins, while the UI and persistence remain separately organized.

The real LLM provider, full agent loop, Git tools, background jobs, sub-agents, and approval workflows are still intentionally not implemented.

## Rules

- Keep the project small and understandable.
- Use TypeScript, ESM, Node.js 22+, pnpm, React, Vite, Vitest, and SQLite.
- Keep UI code independent from database, LLM, and tool implementations.
- Durable session facts belong in the runtime/database layer.
- Temporary presentation state belongs in the UI layer.
- Keep plugins self-contained and copyable.
- Prefer straightforward interfaces over speculative abstractions.
- Add tests for non-trivial behavior.
- Use DeepSeek Harness for architectural inspiration only; do not copy its package structure or Cordis framework.
- Maintain this file whenever the architecture changes.

## Runtime rules

- Plugins register capabilities through `BelPluginContext`.
- Registrations return cleanup functions.
- Plugin setup failures clean up all registrations made during setup.
- Tool input is validated before execution.
- Tool failures use structured error codes instead of untyped thrown errors.
- A tool does not access React or the database directly; it receives a narrow execution context.
- The shell service owns process execution and job tracking, while the plugin only exposes tool registration.
- The agent loop will later consume tool schemas from the registry and persist tool calls/events around execution.

## UI direction

The UI has three primary surfaces: a session/workspace sidebar, a conversation surface, and a session inspector. This mirrors the useful separation in DeepSeek Harness's `ui-workspace` and `ui-chat` packages while remaining a single application.

## Persistence rules

- Session events are durable facts.
- Model-visible activity should be reconstructable from persisted events.
- The UI should depend on runtime contracts rather than database details.
- Read and write operations should go through a small runtime adapter.
- SQLite is the durable source of truth for sessions and events.
- UI-only expanded states are not durable session data.
