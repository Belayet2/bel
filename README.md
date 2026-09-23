# Bel

A simple, understandable, plugin-based agent harness inspired by DeepSeek Harness.

## Current stage

Bel now has integrated filesystem and shell runtime services. Both capabilities are workspace-scoped, use bounded output, support cancellation/timeouts, and are exposed through plugins mounted by `SimplePluginRuntime`. Risky and destructive tools are marked for the safety/approval layer.

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

## Architecture direction

- `src/services` owns reusable filesystem and process services.
- `src/plugins` owns tool registration and cleanup.
- `src/tools` owns validation and structured results.
- `src/agent` owns orchestration and safety.
- `src/db` owns durable session data.
- `src/ui` consumes runtime/session state and does not execute tools.

This follows DeepSeek Harness's useful separation between capability providers, tool registration, agent orchestration, durable session events, and UI projections, without copying its Cordis or monorepo complexity.
