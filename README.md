# Bel project instructions

## Current stage

Bel has a browser-safe SQLite session runtime powering the web UI, plus a Node-oriented default runtime composition for filesystem, shell, and Git plugins. The project also has an OpenRouter provider, agent loop, safety policy, and durable turn runner.

## What is implemented

- UI-first React/Vite workspace with sidebar, conversation, tool cards, and inspector.
- Browser SQLite runtime using `sql.js` and localStorage serialization.
- Reversible plugin host and typed tool registry.
- Workspace-scoped filesystem services and tools.
- Shell command/background-job services and tools.
- Git status, diff, log, show, branch, and commit tools.
- OpenRouter chat-completions provider contract.
- Agent loop with tool-call iteration and loop limit.
- Safety policy and durable agent-turn runner abstractions.

## Known limitations

- The browser runtime uses a development mock assistant response; it does not call OpenRouter.
- The Node runtime and browser runtime are separate; a local HTTP/SSE host is still needed to connect the real agent loop to the browser securely.
- `sql.js` is browser persistence, not a native server SQLite file.
- The agent loop currently needs a host adapter to load persisted conversation history and persist each provider/tool step.
- Approval decisions are represented by a gate but are not yet interactive UI requests.
- Memories, plans, sub-agents, and web tools are not implemented.

## Rules

- Keep Bel small and understandable.
- Keep browser UI free of Node filesystem/process imports.
- Keep durable session facts in runtime/storage; keep expanded cards and other temporary display state in the UI.
- Plugins own registrations and cleanup; shared services belong to the runtime host.
- Tool input is validated before execution and results use structured errors.
- Use DeepSeek Harness as architectural inspiration only; do not copy its package structure or Cordis framework.
- Update this file whenever architecture changes.

## Inspiration

DeepSeek Harness informs the separation between workspace/session navigation, chat rendering, plugin-owned capabilities, typed tool registries, durable session events, and UI projections. Bel intentionally implements these ideas in a much smaller single application.
