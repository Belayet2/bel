import { describe, expect, it, vi } from 'vitest'
import { OpenRouterProvider } from './openrouter'

describe('OpenRouterProvider', () => {
  it('maps a completion and tool call response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'response-1', model: 'deepseek/deepseek-chat', choices: [{
        message: { content: 'I will inspect the file.', tool_calls: [{ id: 'call-1', function: { name: 'read_file', arguments: '{"path":"README.md"}' } }] },
        finish_reason: 'tool_calls',
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const provider = new OpenRouterProvider({ apiKey: 'test-key' })
    const result = await provider.complete({ model: 'deepseek/deepseek-chat', messages: [{ role: 'user', content: 'Inspect README' }] })

    expect(result.content).toContain('inspect')
    expect(result.toolCalls[0]).toMatchObject({ id: 'call-1', name: 'read_file', arguments: { path: 'README.md' } })
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/chat/completions'), expect.objectContaining({ method: 'POST' }))
    vi.unstubAllGlobals()
  })

  it('surfaces provider errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'bad key' } }), { status: 401 })))
    const provider = new OpenRouterProvider({ apiKey: 'bad-key' })
    await expect(provider.complete({ model: 'model', messages: [] })).rejects.toThrow('bad key')
    vi.unstubAllGlobals()
  })
})
