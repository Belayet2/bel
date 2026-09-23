# Bel project instructions

## Purpose

Bel is a personal, understandable, plugin-based agent harness. It is inspired by DeepSeek Harness's “everything is a plugin” philosophy but intentionally remains small.

## Current stage

The first stage is a UI-first vertical slice backed by mock data. The real SQLite persistence layer, plugin runtime, tool registry, OpenRouter provider, agent loop, and safety services are not implemented yet.

## Rules

- Keep the project small and understandable.
- Use TypeScript, ESM, Node.js 22+, pnpm, React, Vite, and Vitest.
- Keep UI code independent from database, LLM, and tool implementations.
- Put durable session facts in a runtime/service layer; keep temporary display state in the UI.
- Keep plugins self-contained and copyable.
- Prefer straightforward interfaces over speculative abstractions.
- Add tests for non-trivial behavior.
- Use DeepSeek Harness for architectural inspiration only; do not copy its package structure or Cordis framework.
- Maintain this file whenever the architecture changes.

## UI direction

The UI has three primary surfaces: a session/workspace sidebar, a conversation surface, and a session inspector. This mirrors the useful separation in DeepSeek Harness's `ui-workspace` and `ui-chat` packages while remaining a single application.
