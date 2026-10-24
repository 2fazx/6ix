import { randomUUID } from 'node:crypto'
import { db } from '../db'
import { offlineUuid } from './offline-uuid'
import { encryptString, decryptString } from './secure-store'
import { loginMicrosoft, refreshMicrosoft } from './microsoft-auth'
import { log } from '../logger'
import type { Account, AccountType, MsAuthProgress } from '@shared/types'

interface Row {
  id: string
  type: AccountType
  username: string
  uuid: string
  xuid: string | null
  skin_url: string | null
  access_token: string | null
  refresh_token: string | null
  expires_at: number | null
  created_at: number
}

const toAccount = (r: Row): Account => ({
  id: r.id, type: r.type, username: r.username, uuid: r.uuid, skinUrl: r.skin_url, createdAt: r.created_at
})

export function listAccounts(): Account[] {
  const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as Row[]
  return rows.map(toAccount)
}

export function getAccount(id: string): Account | null {
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Row | undefined
  return row ? toAccount(row) : null
}

export function createOfflineAccount(username: string): Account {
  const trimmed = username.trim()
  if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmed)) throw new Error('Username must be 3–16 chars: letters, numbers, underscores.')
  const dup = db.prepare("SELECT id FROM accounts WHERE type = 'offline' AND username = ? COLLATE NOCASE").get(trimmed)
  if (dup) throw new Error('An offline account with that username already exists.')

  const id = randomUUID()
  const uuid = offlineUuid(trimmed)
  db.prepare(`INSERT INTO accounts (id, type, username, uuid, created_at) VALUES (?, 'offline', ?, ?, ?)`).run(id, trimmed, uuid, Date.now())
  log.info('offline account created', trimmed)
  return getAccount(id)!
}

export async function createMicrosoftAccount(onProgress?: (p: MsAuthProgress) => void): Promise<Account> {
  const result = await loginMicrosoft(onProgress)

  const existing = db.prepare("SELECT id FROM accounts WHERE type = 'microsoft' AND uuid = ?").get(result.uuid) as { id: string } | undefined
  const encryptedAccess = encryptString(result.accessToken)
  const encryptedRefresh = encryptString(result.refreshToken)

  if (existing) {
    db.prepare(`UPDATE accounts SET username = ?, skin_url = ?, access_token = ?, refresh_token = ?, xuid = ?, expires_at = ? WHERE id = ?`)
      .run(result.username, result.skinUrl, encryptedAccess, encryptedRefresh, result.xuid, result.expiresAt, existing.id)
    log.info('microsoft account refreshed in place', result.username)
    return getAccount(existing.id)!
  }

  const id = randomUUID()
  db.prepare(`INSERT INTO accounts (id, type, username, uuid, skin_url, access_token, refresh_token, xuid, expires_at, created_at) VALUES (?, 'microsoft', ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, result.username, result.uuid, result.skinUrl, encryptedAccess, encryptedRefresh, result.xuid, result.expiresAt, Date.now())
  log.info('microsoft account created', result.username)
  return getAccount(id)!
}

export function deleteAccount(id: string): boolean {
  db.prepare('UPDATE instances SET account_id = NULL WHERE account_id = ?').run(id)
  const res = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
  return res.changes > 0
}

export async function getFreshAccessToken(accountId: string): Promise<{ username: string; uuid: string; xuid: string; accessToken: string; userType: 'legacy' | 'msa' }> {
  const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as Row | undefined
  if (!row) throw new Error('account not found')

  if (row.type === 'offline') {
    return { username: row.username, uuid: row.uuid, xuid: '0', accessToken: '0', userType: 'legacy' }
  }

  const now = Date.now()
  const expiresAt = row.expires_at ?? 0
  
  // FIX: If the account is missing an XUID (old login), or the token is expiring, force a refresh.
  if (!row.xuid || !row.access_token || expiresAt - now <= 5 * 60 * 1000) {
    if (!row.refresh_token) throw new Error('Microsoft session expired — sign in again.')
    log.info('refreshing microsoft session (xuid missing or token expired)', row.username)
    
    const refreshed = await refreshMicrosoft(decryptString(row.refresh_token))

    db.prepare(`UPDATE accounts SET username = ?, uuid = ?, skin_url = ?, access_token = ?, refresh_token = ?, xuid = ?, expires_at = ? WHERE id = ?`)
      .run(refreshed.username, refreshed.uuid, refreshed.skinUrl, encryptString(refreshed.accessToken), encryptString(refreshed.refreshToken), refreshed.xuid, refreshed.expiresAt, row.id)

    return { username: refreshed.username, uuid: refreshed.uuid, xuid: refreshed.xuid, accessToken: refreshed.accessToken, userType: 'msa' }
  }

  return { username: row.username, uuid: row.uuid, xuid: row.xuid, accessToken: decryptString(row.access_token), userType: 'msa' }
}