import { jsonFetch } from './http'
import type { MinecraftVersionSummary } from '@shared/types'

const MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

interface RawManifest {
  latest: { release: string; snapshot: string }
  versions: { id: string; type: string; releaseTime: string; url: string }[]
}

let cache: { at: number; data: MinecraftVersionSummary[] } | null = null
const TTL = 5 * 60 * 1000

export async function listMinecraftVersions(): Promise<MinecraftVersionSummary[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data
  const raw = await jsonFetch<RawManifest>(MANIFEST)
  const data = raw.versions.map(v => ({
    id: v.id,
    type: v.type as MinecraftVersionSummary['type'],
    releaseTime: v.releaseTime
  }))
  cache = { at: Date.now(), data }
  return data
}