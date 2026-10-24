import { randomUUID } from 'node:crypto'
import {
  mkdirSync,
  existsSync,
  lstatSync,
  readlinkSync,
  unlinkSync,
  symlinkSync,
  rmSync,
  readdirSync,
  statSync,
  copyFileSync
} from 'node:fs'
import { join } from 'node:path'
import { db } from '../db'
import { PATHS } from '../paths'
import { log } from '../logger'
import type { CreateProfileInput, Profile } from '@shared/types'

interface Row {
  id: string
  name: string
  share_options: number
  share_config: number
  share_resourcepacks: number
  share_shaderpacks: number
  directory: string
  created_at: number
}

const toProfile = (r: Row): Profile => ({
  id: r.id,
  name: r.name,
  shareOptions: !!r.share_options,
  shareConfig: !!r.share_config,
  shareResourcepacks: !!r.share_resourcepacks,
  shareShaderpacks: !!r.share_shaderpacks,
  directory: r.directory,
  createdAt: r.created_at
})

export function listProfiles(): Profile[] {
  const rows = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all() as Row[]
  return rows.map(toProfile)
}

export function createProfile(input: CreateProfileInput): Profile {
  const id = randomUUID()
  const dir = join(PATHS.profiles(), id)
  mkdirSync(dir, { recursive: true })
  mkdirSync(join(dir, 'config'), { recursive: true })
  db.prepare(
    `INSERT INTO profiles (id, name, share_options, share_config, share_resourcepacks, share_shaderpacks, directory, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.shareOptions ? 1 : 0,
    input.shareConfig ? 1 : 0,
    input.shareResourcepacks ? 1 : 0,
    input.shareShaderpacks ? 1 : 0,
    dir,
    Date.now()
  )
  log.info('profile created', id, input.name)
  return toProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Row)
}

export function deleteProfile(id: string): boolean {
  const row = db.prepare('SELECT directory FROM profiles WHERE id = ?').get(id) as { directory: string } | undefined
  if (!row) return false
  db.prepare('UPDATE instances SET profile_id = NULL WHERE profile_id = ?').run(id)
  db.prepare('DELETE FROM profiles WHERE id = ?').run(id)
  try {
    rmSync(row.directory, { recursive: true, force: true })
  } catch (e) {
    log.warn('profile dir rm failed', String(e))
  }
  return true
}

export function attachProfile(instanceId: string, profileId: string | null): void {
  const row = db.prepare('SELECT directory FROM instances WHERE id = ?').get(instanceId) as { directory: string } | undefined
  if (!row) throw new Error('instance not found')
  db.prepare('UPDATE instances SET profile_id = ? WHERE id = ?').run(profileId, instanceId)
  if (profileId) ensureProfileLinks(row.directory, profileId)
}

/**
 * Idempotent. Called before every launch and every profile attach.
 * Merges existing local content into the shared profile first if present, then
 * replaces the local path with a native symlink (junction on Windows for dirs).
 */
export function ensureProfileLinks(instanceDir: string, profileId: string): void {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as Row | undefined
  if (!profile) throw new Error(`profile ${profileId} not found`)

  const target = profile.directory
  const link = (name: string, isFile: boolean) => {
    const src = join(target, name)
    const dst = join(instanceDir, name)
    if (isFile) {
      mkdirSync(target, { recursive: true })
    } else {
      mkdirSync(src, { recursive: true })
    }
    linkPath(src, dst, isFile)
  }

  if (profile.share_config) link('config', false)
  if (profile.share_resourcepacks) link('resourcepacks', false)
  if (profile.share_shaderpacks) link('shaderpacks', false)
  if (profile.share_options) link('options.txt', true)

  for (const d of ['mods', 'saves', 'logs']) {
    mkdirSync(join(instanceDir, d), { recursive: true })
  }
}

function linkPath(src: string, dst: string, isFile: boolean): void {
  if (existsSync(dst) || isSymlink(dst)) {
    if (isSymlink(dst)) {
      const existing = readlinkSync(dst)
      if (existing === src) return
      unlinkSync(dst)
    } else if (!isFile) {
      try {
        mergeDir(dst, src)
      } catch (e) {
        log.warn('merge failed', String(e))
      }
      rmSync(dst, { recursive: true, force: true })
    } else {
      if (!existsSync(src)) {
        try {
          copyFileSync(dst, src)
        } catch (e) {
          log.warn('file merge failed', String(e))
        }
      }
      unlinkSync(dst)
    }
  }
  try {
    if (process.platform === 'win32') {
      symlinkSync(src, dst, isFile ? 'file' : 'junction')
    } else {
      symlinkSync(src, dst, isFile ? 'file' : 'dir')
    }
  } catch (e) {
    log.error('symlink failed', src, '->', dst, String(e))
    throw new Error(`Could not link shared settings: ${String(e)}`)
  }
}

function isSymlink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink()
  } catch {
    return false
  }
}

function mergeDir(from: string, to: string): void {
  for (const entry of readdirSync(from)) {
    const fSrc = join(from, entry)
    const fDst = join(to, entry)
    const st = statSync(fSrc)
    if (st.isDirectory()) {
      mkdirSync(fDst, { recursive: true })
      mergeDir(fSrc, fDst)
    } else if (!existsSync(fDst)) {
      copyFileSync(fSrc, fDst)
    }
  }
}