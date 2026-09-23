import { describe, expect, it, vi } from 'vitest'
import { InMemoryToolRegistry } from './registry'

describe('InMemoryToolRegistry', () => {
  const tool = {
    name: 'upper',
    description: 'Uppercase text',
    inputSchema: { type: 'object' },
    validate(input: unknown) {
      if (typeof input !== 'object' || input === null) return { code: 'invalid', message: 'object required' }
      const text = (input as { text?: unknown }).text
      return typeof text === 'string' ? { text } : { code: 'invalid', message: 'text required' }
    },
    async execute(input: { text: string }) { return { ok: true, output: input.text.toUpperCase() } },
  }

  it('registers, lists, validates, and executes tools', async () => {
    const registry = new InMemoryToolRegistry()
    const unregister = registry.register(tool)
    expect(registry.list()).toHaveLength(1)
    await expect(registry.execute('upper', { text: 'bel' }, { sessionId: 's', emit: vi.fn() })).resolves.toMatchObject({ ok: true, output: 'BEL' })
    unregister()
    expect(registry.get('upper')).toBeUndefined()
  })

  it('returns structured errors for bad calls', async () => {
    const registry = new InMemoryToolRegistry()
    registry.register(tool)
    await expect(registry.execute('missing', {}, { sessionId: 's', emit: vi.fn() })).resolves.toMatchObject({ ok: false, error: { code: 'tool_not_found' } })
    await expect(registry.execute('upper', {}, { sessionId: 's', emit: vi.fn() })).resolves.toMatchObject({ ok: false, error: { code: 'invalid' } })
  })
})
