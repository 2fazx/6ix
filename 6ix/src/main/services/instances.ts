import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from '../db'
import { PATHS } from '../paths'
import { ensureProfileLinks } from './profiles'
import type { CreateInstanceInput, Instance, Loader, UpdateInstanceInput } from '@shared/types'

interface Row {
  id: string
  name: string
  minecraft_version: string
  loader: Loader
  loader_version: string | null
  icon_path: string | null
  ram_min_mb: number
  ram_max_mb: number
  java_path: string | null
  jvm_args: string | null
  game_args: string | null
  directory: string
  profile_id: string | null
  account_id: string | null
  created_at: number
  last_played_at: number | null
  total_playtime_ms: number
}

const toInstance = (r: Row): Instance => ({
  id: r.id,
  name: r.name,
  minecraftVersion: r.minecraft_version,
  loader: r.loader,
  loaderVersion: r.loader_version,
  iconPath: r.icon_path,
  ramMinMb: r.ram_min_mb,
  ramMaxMb: r.ram_max_mb,
  javaPath: r.java_path,
  jvmArgs: r.jvm_args,
  gameArgs: r.game_args,
  directory: r.directory,
  profileId: r.profile_id,
  accountId: r.account_id,
  createdAt: r.created_at,
  lastPlayedAt: r.last_played_at,
  totalPlaytimeMs: r.total_playtime_ms
})

export function listInstances(): Instance[] {
  const rows = db.prepare('SELECT * FROM instances ORDER BY COALESCE(last_played_at, created_at) DESC').all() as Row[]
  return rows.map(toInstance)
}

export function getInstance(id: string): Instance | null {
  const row = db.prepare('SELECT * FROM instances WHERE id = ?').get(id) as Row | undefined
  return row ? toInstance(row) : null
}

export function createInstance(input: CreateInstanceInput): Instance {
  const id = randomUUID()
  const dir = join(PATHS.instances(), id)
  mkdirSync(dir, { recursive: true })
  for (const d of ['mods', 'resourcepacks', 'shaderpacks', 'saves', 'config', 'logs']) {
    mkdirSync(join(dir, d), { recursive: true })
  }

  db.prepare(
    `INSERT INTO instances
       (id, name, minecraft_version, loader, loader_version, directory,
        ram_min_mb, ram_max_mb, profile_id, account_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, input.name, input.minecraftVersion, input.loader, input.loaderVersion ?? null, dir,
    input.ramMinMb ?? 1024, input.ramMaxMb ?? 4096, input.profileId ?? null, input.accountId ?? null, Date.now()
  )

  if (input.profileId) ensureProfileLinks(dir, input.profileId)
  return getInstance(id)!
}

export function updateInstance(id: string, patch: UpdateInstanceInput): Instance {
  const existing = getInstance(id)
  if (!existing) throw new Error('instance not found')

  const fields: string[] = []
  const values: unknown[] = []
  const set = (col: string, val: unknown) => {
    fields.push(`${col} = ?`)
    values.push(val)
  }

  if (patch.name !== undefined) set('name', patch.name)
  if (patch.ramMinMb !== undefined) set('ram_min_mb', patch.ramMinMb)
  if (patch.ramMaxMb !== undefined) set('ram_max_mb', patch.ramMaxMb)
  if (patch.javaPath !== undefined) set('java_path', patch.javaPath)
  if (patch.jvmArgs !== undefined) set('jvm_args', patch.jvmArgs)
  if (patch.gameArgs !== undefined) set('game_args', patch.gameArgs)
  if (patch.accountId !== undefined) set('account_id', patch.accountId)
  if (patch.profileId !== undefined) set('profile_id', patch.profileId)

  if (fields.length) {
    values.push(id)
    db.prepare(`UPDATE instances SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  if (patch.profileId !== undefined && patch.profileId) {
    ensureProfileLinks(existing.directory, patch.profileId)
  }

  return getInstance(id)!
}

export function deleteInstance(id: string): boolean {
  const row = db.prepare('SELECT id FROM instances WHERE id = ?').get(id)
  if (!row) return false
  db.prepare('DELETE FROM instances WHERE id = ?').run(id)
  return true
}

export function renameInstance(id: string, name: string): boolean {
  const res = db.prepare('UPDATE instances SET name = ? WHERE id = ?').run(name, id)
  return res.changes > 0
}

export function setLastPlayed(id: string, durationMs = 0): void {
  const row = db.prepare('SELECT total_playtime_ms FROM instances WHERE id = ?').get(id) as { total_playtime_ms: number } | undefined
  if (!row) return
  db.prepare('UPDATE instances SET last_played_at = ?, total_playtime_ms = ? WHERE id = ?').run(Date.now(), row.total_playtime_ms + durationMs, id)
}

export async function duplicateInstance(id: string): Promise<Instance> {
  const existing = getInstance(id)
  if (!existing) throw new Error('Instance not found')

  const newId = randomUUID()
  const newDir = join(PATHS.instances(), newId)
  
  await cp(existing.directory, newDir, { recursive: true })

  db.prepare(
    `INSERT INTO instances
       (id, name, minecraft_version, loader, loader_version, directory,
        ram_min_mb, ram_max_mb, profile_id, account_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId, `${existing.name} (Copy)`, existing.minecraftVersion, existing.loader, existing.loaderVersion, newDir,
    existing.ramMinMb, existing.ramMaxMb, existing.profileId, existing.accountId, Date.now()
  )

  return getInstance(newId)!
}