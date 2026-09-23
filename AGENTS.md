# Bel project instructions

## Current stage

Bel now has a default runtime composition that shares workspace-scoped filesystem and shell services across plugins. The default host mounts filesystem, shell, and Git capabilities through the tool registry. The agent loop and durable session runner remain separate consumers of this runtime.

## Runtime rules

- `SimplePluginRuntime` owns shared service instances and plugin lifecycle.
- Plugins register tools; they do not construct duplicate filesystem or shell services.
- Workspace paths cannot escape the configured root.
- Shell output is bounded and commands support timeout/cancellation.
- Risky/destructive tools must be routed through approval before execution.
- UI code must not import Node filesystem/process APIs.
- `createBelRuntime()` is the default composition used by tests and future Node entry points.

## Inspiration

Use DeepSeek Harness as architectural inspiration: capability seams have providers, consumers, and registrations; session-visible work is logged; and UI projects runtime/session facts. Bel keeps these ideas in a small application rather than reproducing the original repository's package graph.
