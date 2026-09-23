import type { ToolRegistry } from '../tools/types'

export interface BelServices {
  readonly filesystem: import('../services/filesystem').FilesystemService
  readonly shell: import('../services/shell').ShellService
}

export interface BelPluginContext {
  readonly tools: ToolRegistry
  readonly services: BelServices
  readonly registerCleanup(cleanup: () => void | Promise<void>): void
}

export interface BelPlugin {
  readonly name: string
  setup(context: BelPluginContext): void | Promise<void>
}

export interface PluginRuntime {
  readonly tools: ToolRegistry
  readonly services: BelServices
  mount(plugin: BelPlugin): Promise<() => Promise<void>>
  mountedPlugins(): readonly string[]
  dispose(): Promise<void>
}
