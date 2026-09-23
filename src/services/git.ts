import { spawn } from 'node:child_process'

export interface GitCommandResult {
  readonly exitCode: number | null
  readonly stdout: string
  readonly stderr: string
}

export class GitService {
  constructor(private readonly workspaceRoot = process.cwd()) {}

  run(args: readonly string[], maxOutputBytes = 200_000): Promise<GitCommandResult> {
    return new Promise(resolve => {
      const child = spawn('git', [...args], {
        cwd: this.workspaceRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      const trim = (value: string): string => value.length > maxOutputBytes ? `${value.slice(0, maxOutputBytes)}\n[output truncated]` : value
      child.stdout.on('data', chunk => { stdout = trim(stdout + chunk.toString()) })
      child.stderr.on('data', chunk => { stderr = trim(stderr + chunk.toString()) })
      child.once('close', exitCode => resolve({ exitCode, stdout, stderr }))
      child.once('error', error => resolve({ exitCode: null, stdout, stderr: error.message }))
    })
  }
}
