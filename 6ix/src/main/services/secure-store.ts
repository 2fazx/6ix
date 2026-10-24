import { safeStorage } from 'electron'
import { log } from '../logger'

/**
 * Wraps Electron's safeStorage. On macOS this is the Keychain, on Windows
 * DPAPI, on Linux libsecret/kwallet. If the OS has no secure backend
 * available, we fall back to plaintext — but stamp the payload so we know.
 */
export function encryptString(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('safeStorage unavailable — falling back to plaintext token storage')
    return `plain:${Buffer.from(plain, 'utf8').toString('base64')}`
  }
  const buf = safeStorage.encryptString(plain)
  return `os:${buf.toString('base64')}`
}

export function decryptString(payload: string): string {
  if (payload.startsWith('plain:')) {
    return Buffer.from(payload.slice(6), 'base64').toString('utf8')
  }
  if (payload.startsWith('os:')) {
    const buf = Buffer.from(payload.slice(3), 'base64')
    return safeStorage.decryptString(buf)
  }
  // Legacy — unencrypted from previous builds
  return payload
}