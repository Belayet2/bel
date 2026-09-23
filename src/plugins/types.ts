import type { ToolRegistry } from '../tools/types'

export interface BelPluginContext {
  readonly tools: ToolRegistry
  readonly registerCleanup(cleanup: () => void | Promise<void>): void
}

export interface BelPlugin {
  readonly name: string
  setup(context: BelPluginContext): void | Promise<void>
}

export interface PluginRuntime {
  readonly tools: ToolRegistry
  mount(plugin: BelPlugin): Promise<() => Promise<void>>
  mountedPlugins(): readonly string[]
  dispose(): Promise<void>
}
