import { afterEach, describe, expect, it } from 'vitest'
import { ShellService } from '../services/shell'
import { SimplePluginRuntime } from './runtime'
import { InMemoryToolRegistry } from '../tools/registry'
import { shellPlugin } from './shell-plugin'

describe('shell plugin', () => {
  const shellService = new ShellService(process.cwd())

  afterEach(() => {
    process.chdir(process.cwd())
  })

  it('runs a command and captures stdout', async () => {
    const result = await shellService.runCommand('node -e "console.log(\'hello bel\')"')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('hello bel')
  })

  it('registers shell tools through the plugin runtime', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(shellPlugin)
    expect(runtime.tools.list().map(tool => tool.name)).toEqual(expect.arrayContaining(['run_command', 'run_background', 'read_job_output', 'kill_job']))
  })

  it('starts and reads a background job', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(shellPlugin)

    const launched = await runtime.tools.execute('run_background', { command: 'node -e "setTimeout(() => console.log(\'job done\'), 150)"' }, { sessionId: 'job-1', emit: () => undefined })
    expect(launched.ok).toBe(true)
    if (!launched.ok) return

    const parsed = JSON.parse(launched.output ?? '{}')
    const reading = await runtime.tools.execute('read_job_output', { jobId: parsed.jobId }, { sessionId: 'job-1', emit: () => undefined })
    expect(reading.ok).toBe(true)
    if (!reading.ok) return
    expect(JSON.parse(reading.output ?? '{}')).toHaveProperty('jobId')
  })
})
