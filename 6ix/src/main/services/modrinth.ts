import { jsonFetch } from './http'
import type {
  ModrinthSearchHit,
  ModrinthSearchQuery,
  ModrinthVersion
} from '@shared/types'

const BASE = 'https://api.modrinth.com/v2'

const facetsFor = (q: ModrinthSearchQuery): string => {
  const facets: string[][] = [[`project_type:${q.projectType}`]]
  if (q.loader) facets.push([`categories:${q.loader}`])
  if (q.gameVersion) facets.push([`versions:${q.gameVersion}`])
  if (q.category) facets.push([`categories:${q.category}`])
  return JSON.stringify(facets)
}

export async function searchProjects(q: ModrinthSearchQuery): Promise<ModrinthSearchHit> {
  const params = new URLSearchParams({
    query: q.query ?? '',
    limit: String(Math.min(q.limit ?? 20, 100)),
    offset: String(q.offset ?? 0),
    index: q.sort ?? 'relevance',
    facets: facetsFor(q)
  })
  return jsonFetch<ModrinthSearchHit>(`${BASE}/search?${params}`)
}

export async function getProjectVersions(
  slugOrId: string,
  loaders?: string[],
  gameVersions?: string[]
): Promise<ModrinthVersion[]> {
  const params = new URLSearchParams()
  if (loaders?.length) params.set('loaders', JSON.stringify(loaders))
  if (gameVersions?.length) params.set('game_versions', JSON.stringify(gameVersions))
  const qs = params.toString()
  return jsonFetch<ModrinthVersion[]>(
    `${BASE}/project/${encodeURIComponent(slugOrId)}/version${qs ? `?${qs}` : ''}`
  )
}