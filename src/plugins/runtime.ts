import type { BelPlugin, BelPluginContext, PluginRuntime } from './types'
import type { ToolRegistry } from '../tools/types'

/**
 * Minimal plugin host. Plugins register capabilities through the context and
 * receive a disposer when unmounted, matching DeepSeek Harness's reversible
 * registration idea without importing a framework.
 */
export class SimplePluginRuntime implements PluginRuntime {
  private readonly plugins = new Map<string, () => Promise<void>>()
  private readonly cleanups = new Set<() => void | Promise<void>>()

  constructor(public readonly tools: ToolRegistry) {}

  async mount(plugin: BelPlugin): Promise<() => Promise<void>> {
    if (this.plugins.has(plugin.name)) throw new Error(`Plugin already mounted: ${plugin.name}`)

    const pluginCleanups = new Set<() => void | Promise<void>>()
    const context: BelPluginContext = {
      tools: this.tools,
      registerCleanup: cleanup => {
        pluginCleanups.add(cleanup)
        this.cleanups.add(cleanup)
      },
    }

    try {
      await plugin.setup(context)
    } catch (error) {
      await this.runCleanups(pluginCleanups)
      throw error
    }

    let disposed = false
    const dispose = async (): Promise<void> => {
      if (disposed) return
      disposed = true
      await this.runCleanups(pluginCleanups)
      this.plugins.delete(plugin.name)
    }
    this.plugins.set(plugin.name, dispose)
    return dispose
  }

  mountedPlugins(): readonly string[] {
    return [...this.plugins.keys()]
  }

  async dispose(): Promise<void> {
    const disposers = [...this.plugins.values()].reverse()
    for (const dispose of disposers) await dispose()
    this.cleanups.clear()
  }

  private async runCleanups(cleanups: Set<() => void | Promise<void>>): Promise<void> {
    const errors: unknown[] = []
    for (const cleanup of [...cleanups].reverse()) {
      try {
        await cleanup()
      } catch (error) {
        errors.push(error)
      }
      this.cleanups.delete(cleanup)
    }
    if (errors.length > 0) throw errors[0]
  }
}
