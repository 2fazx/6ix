import { createHash } from 'node:crypto'

/**
 * Mojang's offline UUID algorithm — UUID v3 (MD5-based) of "OfflinePlayer:<username>".
 * Matches what a vanilla server with online-mode=false generates, so worlds,
 * skin caches, and server UUIDs line up. This is the real thing.
 */
export function offlineUuid(username: string): string {
  const hash = createHash('md5').update(`OfflinePlayer:${username}`, 'utf8').digest()
  hash[6] = (hash[6] & 0x0f) | 0x30
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}