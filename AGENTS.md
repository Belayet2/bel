# Bel project instructions

## Current stage

Bel has integrated filesystem and shell runtime services. The services are reusable and workspace-scoped; plugins expose them as tools; the agent loop will consume those tools; and durable session events remain owned by the persistence layer.

## Runtime rules

- `SimplePluginRuntime` owns shared service instances and plugin lifecycle.
- Filesystem and shell plugins register tools; they do not construct duplicate services.
- Workspace paths cannot escape the configured root.
- Shell output is bounded and commands support timeout/cancellation.
- Risky/destructive tools must be routed through approval before execution.
- UI code must not import Node filesystem/process APIs.

## Inspiration

Use DeepSeek Harness as architectural inspiration: capability seams have providers, consumers, and registrations; session-visible work is logged; and UI projects runtime/session facts. Bel keeps these ideas in a small application rather than reproducing the original repository's package graph.
