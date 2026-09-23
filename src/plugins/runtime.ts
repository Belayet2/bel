import type { BelPlugin, BelPluginContext, BelServices, PluginRuntime } from './types'
import type { ToolRegistry } from '../tools/types'
import { FilesystemService } from '../services/filesystem'
import { ShellService } from '../services/shell'

export interface PluginRuntimeOptions {
  readonly workspaceRoot?: string
}

/** Small runtime host: services are shared, plugins own registrations and cleanup. */
export class SimplePluginRuntime implements PluginRuntime {
  private readonly plugins = new Map<string, () => Promise<void>>()
  private readonly cleanups = new Set<() => void | Promise<void>>()
  readonly services: BelServices

  constructor(public readonly tools: ToolRegistry, options: PluginRuntimeOptions = {}) {
    const workspaceRoot = options.workspaceRoot
    this.services = {
      filesystem: new FilesystemService(workspaceRoot),
      shell: new ShellService(workspaceRoot),
    }
  }

  async mount(plugin: BelPlugin): Promise<() => Promise<void>> {
    if (this.plugins.has(plugin.name)) throw new Error(`Plugin already mounted: ${plugin.name}`)
    const pluginCleanups = new Set<() => void | Promise<void>>()
    const context: BelPluginContext = {
      tools: this.tools,
      services: this.services,
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

  mountedPlugins(): readonly string[] { return [...this.plugins.keys()] }

  async dispose(): Promise<void> {
    for (const dispose of [...this.plugins.values()].reverse()) await dispose()
    this.cleanups.clear()
    this.services.shell.dispose()
  }

  private async runCleanups(cleanups: Set<() => void | Promise<void>>): Promise<void> {
    let firstError: unknown
    for (const cleanup of [...cleanups].reverse()) {
      try { await cleanup() } catch (error) { firstError ??= error }
      this.cleanups.delete(cleanup)
    }
    if (firstError !== undefined) throw firstError
  }
}
