import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

export type JobStatus = 'running' | 'completed' | 'failed' | 'killed'
export interface JobRecord { id: string; command: string; pid: number | null; status: JobStatus; stdout: string; stderr: string; startedAt: string; finishedAt?: string; exitCode?: number | null; signal?: string }
export interface ShellCommandResult { exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }

export class ShellService {
  private readonly jobs = new Map<string, { record: JobRecord; child: ChildProcessWithoutNullStreams }>()
  constructor(readonly workspaceRoot = process.cwd()) {}

  runCommand(command: string, options: { timeoutMs?: number; maxOutputBytes?: number; signal?: AbortSignal } = {}): Promise<ShellCommandResult> {
    const timeoutMs = options.timeoutMs ?? 30_000
    const maxOutputBytes = options.maxOutputBytes ?? 200_000
    return new Promise((resolve) => {
      const child = spawn(command, { cwd: this.workspaceRoot, shell: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''; let stderr = ''; let timedOut = false; let done = false
      const trim = (value: string): string => value.length > maxOutputBytes ? value.slice(0, maxOutputBytes) + '\n[output truncated]' : value
      const finish = (exitCode: number | null): void => { if (done) return; done = true; clearTimeout(timer); resolve({ exitCode, stdout: trim(stdout), stderr: trim(stderr), timedOut }) }
      child.stdout.on('data', chunk => { stdout = trim(stdout + chunk.toString()) })
      child.stderr.on('data', chunk => { stderr = trim(stderr + chunk.toString()) })
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM') }, timeoutMs)
      const abort = (): void => { child.kill('SIGTERM') }
      options.signal?.addEventListener('abort', abort, { once: true })
      child.once('close', code => { options.signal?.removeEventListener('abort', abort); finish(code) })
      child.once('error', () => finish(null))
    })
  }

  startBackground(command: string, maxOutputBytes = 200_000): JobRecord {
    const id = `job-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const child = spawn(command, { cwd: this.workspaceRoot, shell: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    const record: JobRecord = { id, command, pid: child.pid ?? null, status: 'running', stdout: '', stderr: '', startedAt: new Date().toISOString() }
    const trim = (value: string): string => value.length > maxOutputBytes ? value.slice(0, maxOutputBytes) + '\n[output truncated]' : value
    child.stdout.on('data', chunk => { record.stdout = trim(record.stdout + chunk.toString()) })
    child.stderr.on('data', chunk => { record.stderr = trim(record.stderr + chunk.toString()) })
    child.once('close', (code, signal) => { record.status = code === 0 ? 'completed' : signal ? 'killed' : 'failed'; record.exitCode = code; record.signal = signal ?? undefined; record.finishedAt = new Date().toISOString() })
    child.once('error', () => { record.status = 'failed'; record.finishedAt = new Date().toISOString() })
    this.jobs.set(id, { record, child }); return record
  }

  readJobOutput(id: string): JobRecord | undefined { return this.jobs.get(id)?.record }
  killJob(id: string): boolean { const job = this.jobs.get(id); if (!job || job.record.status !== 'running') return false; job.child.kill('SIGTERM'); job.record.status = 'killed'; return true }
  dispose(): void { for (const { child } of this.jobs.values()) child.kill('SIGTERM'); this.jobs.clear() }
}
