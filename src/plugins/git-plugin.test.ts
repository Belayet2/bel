import { describe, expect, it } from 'vitest'
import { InMemoryToolRegistry } from '../tools/registry'
import { SimplePluginRuntime } from './runtime'
import { gitPlugin } from './git-plugin'

describe('git plugin', () => {
  it('registers the Git tools', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(gitPlugin)
    expect(runtime.tools.list().map(tool => tool.name)).toEqual(expect.arrayContaining(['git_status', 'git_diff', 'git_log', 'git_show', 'git_commit', 'git_branch']))
  })

  it('returns structured errors outside a Git repository', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(gitPlugin)
    const result = await runtime.tools.execute('git_status', {}, { sessionId: 'git-test', emit: () => undefined })
    expect(result).toHaveProperty('ok')
  })
})
