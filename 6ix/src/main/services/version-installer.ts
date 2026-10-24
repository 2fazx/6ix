import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PATHS } from '../paths'
import { jsonFetch } from './http'
import { downloadFile } from './downloader'
import { extractNatives } from './native-extract'
import type { InstallProgress } from '@shared/types'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const ASSETS_BASE = 'https://resources.download.minecraft.net'
const FABRIC_META = 'https://meta.fabricmc.net/v2'

export interface LibraryRule {
  action: 'allow' | 'disallow'
  os?: { name?: string; arch?: string; version?: string }
  features?: Record<string, boolean>
}

interface Artifact {
  path: string
  url: string
  sha1: string
  size: number
}

interface Library {
  name: string
  downloads?: { artifact?: Artifact; classifiers?: Record<string, Artifact> }
  natives?: Record<string, string>
  rules?: LibraryRule[]
  extract?: { exclude?: string[] }
  url?: string 
}

export interface VersionJson {
  id: string
  type: string
  mainClass: string
  assets: string
  minecraftArguments?: string
  arguments?: { game?: (string | { rules?: LibraryRule[]; value: string | string[] })[]; jvm?: (string | { rules?: LibraryRule[]; value: string | string[] })[] }
  assetIndex?: { id: string; url: string; sha1: string; size: number }
  downloads: { client?: { url: string; sha1: string; size: number } }
  libraries: Library[]
  javaVersion?: { majorVersion: number; component: string }
  logging?: { client?: { argument: string; file: { id: string; url: string; sha1: string; size: number } } }
}

export interface InstalledVersion {
  versionId: string
  versionDir: string
  versionJsonPath: string
  clientJar: string
  librariesDir: string
  nativesDir: string
  assetsDir: string
  assetIndexId: string
  logConfigPath: string | null
  logConfigArg: string | null
  mainClass: string
}

const versionDir = (id: string) => join(PATHS.data(), 'versions', id)
const librariesDir = () => join(PATHS.data(), 'libraries')
const assetsDir = () => join(PATHS.data(), 'assets')

export function isVersionInstalled(versionId: string): boolean {
  const dir = versionDir(versionId)
  const json = join(dir, `${versionId}.json`)
  const jar = join(dir, `${versionId}.jar`)
  return existsSync(json) && existsSync(jar)
}

export async function ensureVersionInstalled(
  versionId: string,
  loader: string,
  loaderVersion: string | null,
  onProgress: (p: InstallProgress) => void
): Promise<InstalledVersion> {
  const dir = versionDir(versionId)
  mkdirSync(dir, { recursive: true })
  mkdirSync(librariesDir(), { recursive: true })
  mkdirSync(assetsDir(), { recursive: true })

  const versionJsonPath = join(dir, `${versionId}.json`)
  const clientJar = join(dir, `${versionId}.jar`)
  const nativesDir = join(dir, 'natives')
  mkdirSync(nativesDir, { recursive: true })

  onProgress({ versionId, stage: 'manifest', current: 0, total: 1, message: 'Fetching version manifest…' })
  const manifest = await jsonFetch<{ versions: { id: string; url: string }[] }>(MANIFEST_URL)
  const entry = manifest.versions.find(v => v.id === versionId)
  if (!entry) throw new Error(`Version ${versionId} not found in Mojang manifest.`)

  let baseJson: VersionJson
  if (existsSync(versionJsonPath)) {
    baseJson = JSON.parse(await readFile(versionJsonPath, 'utf8')) as VersionJson
  } else {
    onProgress({ versionId, stage: 'version-json', current: 0, total: 1, message: 'Downloading version metadata…' })
    baseJson = await jsonFetch<VersionJson>(entry.url)
    writeFileSync(versionJsonPath, JSON.stringify(baseJson, null, 2))
  }

  let mainClass = baseJson.mainClass
  if (loader === 'fabric') {
    onProgress({ versionId, stage: 'version-json', current: 0, total: 1, message: 'Fetching Fabric metadata…' })
    let finalLoaderVer = loaderVersion
    if (!finalLoaderVer) {
      const loaders = await jsonFetch<{ loader: { version: string; stable: boolean } }[]>(`${FABRIC_META}/versions/loader/${versionId}`)
      const stable = loaders.find(l => l.loader.stable)
      finalLoaderVer = stable?.loader.version || loaders[0].loader.version
    }
    const fabricJson = await jsonFetch<VersionJson>(`${FABRIC_META}/versions/loader/${versionId}/${finalLoaderVer}/profile/json`)
    mainClass = fabricJson.mainClass
    baseJson.libraries.push(...fabricJson.libraries)
  }

  if (!existsSync(clientJar) || (baseJson.downloads.client && statSync(clientJar).size !== baseJson.downloads.client.size)) {
    if (!baseJson.downloads.client) throw new Error('Version JSON has no client download.')
    onProgress({ versionId, stage: 'client-jar', current: 0, total: 1, message: 'Downloading client jar…' })
    await downloadFile(baseJson.downloads.client.url, clientJar)
  }

  const features = new Set<string>()
  const applicableLibs = baseJson.libraries.filter(lib => matchesRules(lib.rules, features))
  const classpathArtifacts: { url: string; path: string }[] = []
  const nativeArtifacts: { artifact: Artifact; exclude: string[] }[] = []

  for (const lib of applicableLibs) {
    if (lib.natives) {
      const osKey = platformOs()
      const archKey = platformArch()
      const nativeName = lib.natives[osKey]?.replace('${arch}', archKey === 'x86_64' ? '64' : '32')
      if (nativeName && lib.downloads?.classifiers?.[nativeName]) {
        nativeArtifacts.push({ artifact: lib.downloads.classifiers[nativeName], exclude: lib.extract?.exclude ?? ['META-INF/'] })
      }
      continue
    }
    if (/:natives-/.test(lib.name)) {
      if (lib.downloads?.artifact) {
        nativeArtifacts.push({ artifact: lib.downloads.artifact, exclude: lib.extract?.exclude ?? ['META-INF/'] })
      }
      continue
    }
    if (lib.downloads?.artifact) {
      classpathArtifacts.push({ url: lib.downloads.artifact.url, path: lib.downloads.artifact.path })
    } else if (lib.name && lib.url) {
      const [group, artifact, version] = lib.name.split(':')
      const path = `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}.jar`
      classpathArtifacts.push({ url: `${lib.url}${path}`, path })
    }
  }

  const libTasks = classpathArtifacts.map(a => ({ url: a.url, target: join(librariesDir(), a.path) }))
  let libDone = 0
  const libTotal = libTasks.length
  await pool(libTasks, 6, async task => {
    if (!existsSync(task.target) || statSync(task.target).size === 0) {
      await downloadFile(task.url, task.target)
    }
    libDone++
    if (libDone % 5 === 0) onProgress({ versionId, stage: 'libraries', current: libDone, total: libTotal, message: `Downloading libraries (${libDone}/${libTotal})` })
  })

  onProgress({ versionId, stage: 'natives', current: 0, total: nativeArtifacts.length, message: 'Extracting natives…' })
  let nativesDone = 0
  for (const { artifact, exclude } of nativeArtifacts) {
    const target = join(librariesDir(), artifact.path)
    if (!existsSync(target) || statSync(target).size === 0) {
      await downloadFile(artifact.url, target)
    }
    await extractNatives(target, nativesDir, exclude)
    nativesDone++
    onProgress({ versionId, stage: 'natives', current: nativesDone, total: nativeArtifacts.length, message: `Extracting natives (${nativesDone}/${nativeArtifacts.length})` })
  }

  const assetIndexId = baseJson.assetIndex?.id ?? baseJson.assets ?? 'legacy'
  const assetIndexDir = join(assetsDir(), 'indexes')
  mkdirSync(assetIndexDir, { recursive: true })
  const assetIndexPath = join(assetIndexDir, `${assetIndexId}.json`)

  if (!existsSync(assetIndexPath) && baseJson.assetIndex) {
    onProgress({ versionId, stage: 'assets-index', current: 0, total: 1, message: 'Downloading asset index…' })
    await downloadFile(baseJson.assetIndex.url, assetIndexPath)
  }

  if (existsSync(assetIndexPath)) {
    const index = JSON.parse(await readFile(assetIndexPath, 'utf8')) as { objects: Record<string, { hash: string; size: number }> }
    const uniqueHashes = new Set<string>()
    const assetTasks = []
    for (const o of Object.values(index.objects)) {
      if (uniqueHashes.has(o.hash)) continue
      uniqueHashes.add(o.hash)
      const prefix = o.hash.slice(0, 2)
      assetTasks.push({ url: `${ASSETS_BASE}/${prefix}/${o.hash}`, target: join(assetsDir(), 'objects', prefix, o.hash), size: o.size })
    }
    let assetsDone = 0
    const assetTotal = assetTasks.length
    await pool(assetTasks, 12, async task => {
      if (!existsSync(task.target) || statSync(task.target).size !== task.size) {
        await downloadFile(task.url, task.target)
      }
      assetsDone++
      if (assetsDone % 10 === 0 || assetsDone === assetTotal) {
        onProgress({ versionId, stage: 'assets', current: assetsDone, total: assetTotal, message: `Downloading assets (${assetsDone}/${assetTotal})` })
      }
    })
  }

  let logConfigPath: string | null = null
  let logConfigArg: string | null = null
  if (baseJson.logging?.client) {
    const logDir = join(assetsDir(), 'log_configs')
    mkdirSync(logDir, { recursive: true })
    logConfigPath = join(logDir, baseJson.logging.client.file.id)
    if (!existsSync(logConfigPath)) {
      await downloadFile(baseJson.logging.client.file.url, logConfigPath)
    }
    logConfigArg = baseJson.logging.client.argument
  }

  onProgress({ versionId, stage: 'done', current: 1, total: 1, message: 'Ready to launch.' })

  return {
    versionId, versionDir: dir, versionJsonPath, clientJar, librariesDir: librariesDir(), nativesDir, assetsDir: assetsDir(), assetIndexId, logConfigPath, logConfigArg, mainClass
  }
}

export function platformOs(): 'windows' | 'osx' | 'linux' {
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'darwin') return 'osx'
  return 'linux'
}

export function platformArch(): 'x86_64' | 'arm64' | 'x86' {
  if (process.arch === 'x64') return 'x86_64'
  if (process.arch === 'arm64') return 'arm64'
  return 'x86'
}

export function matchesRules(rules: LibraryRule[] | undefined, features: Set<string>): boolean {
  if (!rules || rules.length === 0) return true
  let allowed = false
  for (const rule of rules) {
    if (ruleMatches(rule, features)) allowed = rule.action === 'allow'
  }
  return allowed
}

function ruleMatches(rule: LibraryRule, features: Set<string>): boolean {
  if (rule.os) {
    const os = platformOs()
    const arch = platformArch()
    if (rule.os.name && rule.os.name !== os) return false
    if (rule.os.arch) {
      if (rule.os.arch === 'x86' && process.arch !== 'ia32') return false
      if (rule.os.arch === 'x86_64' && arch !== 'x86_64') return false
      if (rule.os.arch === 'arm64' && arch !== 'arm64') return false
    }
  }
  return true
}

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      await worker(items[i])
    }
  })
  await Promise.all(workers)
}