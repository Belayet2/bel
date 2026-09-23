import { describe, expect, it, vi } from 'vitest'
import { diagnosticsPlugin } from './diagnostics-plugin'
import { SimplePluginRuntime } from './runtime'
import { InMemoryToolRegistry } from '../tools/registry'

describe('SimplePluginRuntime', () => {
  it('mounts a plugin and exposes its tools', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    const dispose = await runtime.mount(diagnosticsPlugin)

    expect(runtime.mountedPlugins()).toEqual(['bel-diagnostics'])
    expect(runtime.tools.list().map(tool => tool.name)).toEqual(['echo'])
    await dispose()
    expect(runtime.tools.list()).toHaveLength(0)
  })

  it('rejects duplicate plugin names', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(diagnosticsPlugin)
    await expect(runtime.mount(diagnosticsPlugin)).rejects.toThrow('already mounted')
  })

  it('cleans up a failed plugin setup', async () => {
    const registry = new InMemoryToolRegistry()
    const runtime = new SimplePluginRuntime(registry)
    const cleanup = vi.fn()
    await expect(runtime.mount({
      name: 'broken',
      setup(context) {
        context.registerCleanup(cleanup)
        throw new Error('setup failed')
      },
    })).rejects.toThrow('setup failed')
    expect(cleanup).toHaveBeenCalledOnce()
  })
})
