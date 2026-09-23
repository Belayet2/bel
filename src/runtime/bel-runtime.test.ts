import { describe, expect, it } from 'vitest'
import { createBelRuntime } from './bel-runtime'

describe('createBelRuntime', () => {
  it('mounts the default capability plugins', async () => {
    const runtime = await createBelRuntime()
    expect(runtime.mountedPlugins()).toEqual(['bel-filesystem-runtime', 'bel-shell-runtime', 'bel-git'])
    expect(runtime.tools.list().map(tool => tool.name)).toEqual(expect.arrayContaining([
      'read_file', 'write_file', 'list_directory', 'delete_file',
      'run_command', 'run_background', 'read_job_output', 'kill_job',
      'git_status', 'git_diff', 'git_log', 'git_show', 'git_commit', 'git_branch',
    ]))
    await runtime.dispose()
  })
})
