import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const MC_API = 'https://api.minecraftservices.com'

export interface MinecraftProfile {
  id: string
  name: string
  skins: { id: string; state: string; url: string; variant: string }[]
  capes: { id: string; state: string; url: string; alias: string }[]
}

// In-memory cache to prevent rate limits
let cachedProfile: MinecraftProfile | null = null
let cacheTime = 0

export async function fetchProfile(token: string): Promise<MinecraftProfile> {
  const now = Date.now()
  
  // If we have a cached profile from the last 60 seconds, return it
  if (cachedProfile && now - cacheTime < 60000) {
    return cachedProfile
  }

  const res = await fetch(`${MC_API}/minecraft/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limited by Mojang. Please wait a minute.')
    throw new Error(`Failed to fetch profile: ${res.status}`)
  }
  
  const data = await res.json()
  cachedProfile = data
  cacheTime = now
  return data
}

export async function uploadSkin(token: string, filePath: string, variant: 'classic' | 'slim'): Promise<void> {
  const buffer = await readFile(filePath)
  const blob = new Blob([buffer], { type: 'image/png' })
  
  const formData = new FormData()
  formData.append('variant', variant)
  formData.append('file', blob, basename(filePath))

  const res = await fetch(`${MC_API}/minecraft/profile/skins`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  })

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limited. Wait a minute before changing skins.')
    const err = await res.text()
    throw new Error(`Failed to upload skin: ${res.status} ${err}`)
  }
  cachedProfile = null // Clear cache so next fetch gets the new skin
}

export async function equipCape(token: string, capeId: string | null): Promise<void> {
  const res = await fetch(`${MC_API}/minecraft/profile/capes/active`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ capeId: capeId || '' })
  })

  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limited. Wait a minute before changing capes.')
    const err = await res.text()
    throw new Error(`Failed to equip cape: ${res.status} ${err}`)
  }
  cachedProfile = null // Clear cache so next fetch gets the new cape
}