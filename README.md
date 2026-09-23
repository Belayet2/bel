import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { InMemoryToolRegistry } from '../tools/registry'
import { SimplePluginRuntime } from './runtime'
import { filesystemPlugin } from './filesystem-plugin'

describe('filesystem plugin', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bel-filesystem-'))
    process.chdir(tempDir)
  })

  afterEach(async () => {
    process.chdir('/workspace')
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('registers filesystem tools and reads files safely', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(filesystemPlugin)

    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true })
    await fs.writeFile(path.join(tempDir, 'src', 'app.txt'), 'hello bel\nsecond line', 'utf8')

    const result = await runtime.tools.execute('read_file', { path: 'src/app.txt' }, { sessionId: 's-1', emit: () => undefined })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.output).toContain('hello bel')
  })

  it('rejects writes outside the workspace root', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(filesystemPlugin)

    const result = await runtime.tools.execute('write_file', { path: '../escape.txt', content: 'bad' }, { sessionId: 's-2', emit: () => undefined })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error?.code).toBe('write_file_failed')
  })

  it('supports list_directory, grep, and copy_file', async () => {
    const runtime = new SimplePluginRuntime(new InMemoryToolRegistry())
    await runtime.mount(filesystemPlugin)

    await fs.mkdir(path.join(tempDir, 'nested'), { recursive: true })
    await fs.writeFile(path.join(tempDir, 'nested', 'alpha.txt'), 'bel agent\nplugin tool', 'utf8')

    const list = await runtime.tools.execute('list_directory', { path: '.' }, { sessionId: 's-3', emit: () => undefined })
    expect(list.ok).toBe(true)
    if (!list.ok) return
    expect(list.output).toContain('nested')

    const grep = await runtime.tools.execute('grep', { path: '.', pattern: 'agent' }, { sessionId: 's-3', emit: () => undefined })
    expect(grep.ok).toBe(true)
    if (!grep.ok) return
    expect(grep.output).toContain('alpha.txt')

    const copy = await runtime.tools.execute('copy_file', { from: 'nested/alpha.txt', to: 'nested/alpha-copy.txt' }, { sessionId: 's-3', emit: () => undefined })
    expect(copy.ok).toBe(true)
    const copied = await fs.readFile(path.join(tempDir, 'nested', 'alpha-copy.txt'), 'utf8')
    expect(copied).toContain('agent')
  })
})
