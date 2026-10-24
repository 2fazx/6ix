import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { log } from '../logger'
import type { LaunchLog, LaunchExit } from '@shared/types'

export interface RunningProcess {
  child: ChildProcess
  startedAt: number
  emitter: EventEmitter
}

const running = new Map<string, RunningProcess>()

export function isInstanceRunning(id: string): boolean {
  return running.has(id)
}

export function listRunning(): string[] {
  return [...running.keys()]
}

export interface SpawnOptions {
  instanceId: string
  java: string
  args: string[]
  cwd: string
  onLog: (log: LaunchLog) => void
  onExit: (exit: LaunchExit) => void
}

export function spawnMinecraft(opts: SpawnOptions): { pid: number } {
  if (running.has(opts.instanceId)) throw new Error('instance is already running')

  log.info('spawning', opts.java, opts.args.length, 'args, cwd', opts.cwd)

  const child = spawn(opts.java, opts.args, {
    cwd: opts.cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  if (!child.pid) throw new Error('failed to spawn java process')

  const emitter = new EventEmitter()

  child.stdout?.on('data', d => {
    opts.onLog({ type: 'out', text: d.toString() })
  })
  child.stderr?.on('data', d => {
    opts.onLog({ type: 'err', text: d.toString() })
  })

  const startedAt = Date.now()

  child.on('error', err => {
    opts.onLog({ type: 'sys', text: `process error: ${err.message}\n` })
  })

  child.on('exit', (code, signal) => {
    running.delete(opts.instanceId)
    opts.onExit({ code, signal, durationMs: Date.now() - startedAt })
  })

  running.set(opts.instanceId, { child, startedAt, emitter })
  return { pid: child.pid }
}

export function killInstance(instanceId: string): boolean {
  const r = running.get(instanceId)
  if (!r) return false
  r.child.kill('SIGTERM')
  setTimeout(() => {
    if (!r.child.killed) r.child.kill('SIGKILL')
  }, 5000)
  return true
}