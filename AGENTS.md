# Bel project instructions

## Purpose

Bel is a personal, understandable, plugin-based agent harness. It is inspired by DeepSeek Harness's “everything is a plugin” philosophy but intentionally remains small.

## Current stage

Bel now includes a plugin runtime, tool registry, filesystem and shell plugins, Git plugin, OpenRouter provider abstraction, agent loop orchestration, and a lightweight safety/approval system. The project stays small and readable while still modeling the real control flow of an agent harness.

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
- The agent loop is the orchestration layer: it sends prompts to the provider, executes tool calls, and loops until the final answer arrives.
- The approval gate blocks risky or destructive operations until the user explicitly approves them.
- The loop should eventually persist tool calls, events, and session state in SQLite.

## UI direction

The UI has three primary surfaces: a session/workspace sidebar, a conversation surface, and a session inspector. This mirrors the useful separation in DeepSeek Harness's `ui-workspace` and `ui-chat` packages while remaining a single application.

## Persistence rules

- Session events are durable facts.
- Model-visible activity should be reconstructable from persisted events.
- The UI should depend on runtime contracts rather than database details.
- Read and write operations should go through a small runtime adapter.
- SQLite is the durable source of truth for sessions and events.
- UI-only expanded states are not durable session data.
