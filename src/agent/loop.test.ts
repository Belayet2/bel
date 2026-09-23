import { describe, expect, it } from 'vitest'
import { AgentLoop } from './loop'

describe('AgentLoop', () => {
  it('returns a final answer when the model provides no tool calls', async () => {
    const provider = {
      name: 'fake',
      async complete() {
        return {
          id: 'response-1',
          model: 'fake-model',
          content: 'Final answer from the model',
          toolCalls: [],
          finishReason: 'stop',
        }
      },
    }

    const loop = new AgentLoop(provider, new Map(), { model: 'fake-model' })
    const result = await loop.run([{ role: 'user', content: 'Say hello' }])

    expect(result.finalText).toBe('Final answer from the model')
    expect(result.toolResults).toEqual([])
  })

  it('executes a tool call and feeds the result back into the loop', async () => {
    const tool = {
      name: 'echo',
      description: 'Echo text back to the model',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      validate(input: unknown) {
        if (typeof input !== 'object' || input === null) return { code: 'invalid', message: 'expect object' }
        return input as { text: string }
      },
      async execute(input) {
        return { ok: true, output: `echo:${input.text}` }
      },
    }

    let step = 0
    const provider = {
      name: 'fake',
      async complete() {
        step += 1
        if (step === 1) {
          return {
            id: 'response-1',
            model: 'fake-model',
            content: '',
            toolCalls: [{ id: 'call-1', name: 'echo', arguments: { text: 'hello' } }],
            finishReason: 'tool_calls',
          }
        }
        return {
          id: 'response-2',
          model: 'fake-model',
          content: 'done',
          toolCalls: [],
          finishReason: 'stop',
        }
      },
    }

    const loop = new AgentLoop(provider, new Map([['echo', tool]]), { model: 'fake-model' })
    const result = await loop.run([{ role: 'user', content: 'Use the tool' }])

    expect(result.finalText).toBe('done')
    expect(result.toolResults[0]).toMatchObject({ name: 'echo', ok: true, output: 'echo:hello' })
  })
})
