import { shell } from 'electron'
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

export async function openInstancePath(instanceDir: string, sub?: string): Promise<void> {
  const base = resolve(instanceDir)
  const target = sub && sub !== 'root' ? resolve(join(base, sub)) : base
  if (!target.startsWith(base)) throw new Error('invalid path')
  const err = await shell.openPath(target)
  if (err) throw new Error(err)
}

export async function readInstanceLog(instanceDir: string): Promise<string | null> {
  const p = join(instanceDir, 'logs', 'latest.log')
  if (!existsSync(p)) return null
  return readFile(p, 'utf8')
}