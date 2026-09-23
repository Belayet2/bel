import { FilesystemService } from './filesystem'
import { ShellService } from './shell'
import { describe, expect, it } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

describe('runtime services', () => {
  it('keeps filesystem operations inside the workspace root', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bel-runtime-'))
    const service = new FilesystemService(root)
    await service.writeFile('hello.txt', 'hello')
    await expect(service.readFile('hello.txt')).resolves.toBe('hello')
    await expect(service.readFile('../outside.txt')).rejects.toThrow('outside the workspace')
    await fs.rm(root, { recursive: true, force: true })
  })

  it('runs commands with bounded output and timeout support', async () => {
    const service = new ShellService(process.cwd())
    await expect(service.runCommand('node -e "console.log(\'bel\')"')).resolves.toMatchObject({ exitCode: 0, stdout: expect.stringContaining('bel') })
    const timed = await service.runCommand('node -e "setTimeout(() => {}, 1000)"', { timeoutMs: 20 })
    expect(timed.timedOut).toBe(true)
  })
})
