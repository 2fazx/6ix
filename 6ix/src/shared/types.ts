export type Loader = 'vanilla' | 'fabric' | 'forge' | 'neoforge' | 'quilt'
export type AccountType = 'microsoft' | 'offline'

export interface Account {
  id: string
  type: AccountType
  username: string
  uuid: string
  skinUrl: string | null
  xuid?: string | null
  createdAt: number
}

export interface Profile {
  id: string
  name: string
  shareOptions: boolean
  shareConfig: boolean
  shareResourcepacks: boolean
  shareShaderpacks: boolean
  directory: string
  createdAt: number
}

export interface Instance {
  id: string
  name: string
  minecraftVersion: string
  loader: Loader
  loaderVersion: string | null
  iconPath: string | null
  ramMinMb: number
  ramMaxMb: number
  javaPath: string | null
  jvmArgs: string | null
  gameArgs: string | null
  directory: string
  profileId: string | null
  accountId: string | null
  createdAt: number
  lastPlayedAt: number | null
  totalPlaytimeMs: number
}

export interface MinecraftVersionSummary {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  releaseTime: string
}

export interface ModrinthProject {
  id: string
  slug: string
  title: string
  description: string
  categories: string[]
  client_side: 'required' | 'optional' | 'unsupported'
  server_side: 'required' | 'optional' | 'unsupported'
  downloads: number
  icon_url: string | null
  author: string
  versions: string[]
  loaders: string[]
  updated: string
}

export interface ModrinthSearchHit {
  hits: ModrinthProject[]
  offset: number
  limit: number
  total_hits: number
}

export interface ModrinthSearchQuery {
  query?: string
  projectType: 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack' | 'plugin'
  loader?: string
  gameVersion?: string
  category?: string
  sort?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'
  offset?: number
  limit?: number
}

export interface ModrinthFile {
  url: string
  filename: string
  primary: boolean
  size: number
}

export interface ModrinthDependency {
  version_id: string | null
  project_id: string | null
  dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface ModrinthVersion {
  id: string
  project_id: string
  name: string
  version_number: string
  game_versions: string[]
  loaders: string[]
  date_published: string
  downloads: number
  files: ModrinthFile[]
  dependencies: ModrinthDependency[]
}

export interface ModFile {
  fileName: string
  displayName: string
  sizeBytes: number
  enabled: boolean
  mtime: number
}

export interface DownloadProgress {
  url: string
  received: number
  total: number
  filename: string
}

export interface AppSettings {
  theme: 'dark'
  instanceDir: string
  javaPath: string | null
  downloadConcurrency: number
  defaultRamMinMb: number
  defaultRamMaxMb: number
  discordRpc: boolean
  reduceMotion: boolean
}

export interface CreateInstanceInput {
  name: string
  minecraftVersion: string
  loader: Loader
  loaderVersion?: string | null
  ramMinMb?: number
  ramMaxMb?: number
  profileId?: string | null
  accountId?: string | null
}

export interface UpdateInstanceInput {
  name?: string
  ramMinMb?: number
  ramMaxMb?: number
  javaPath?: string | null
  jvmArgs?: string | null
  gameArgs?: string | null
  accountId?: string | null
  profileId?: string | null
}

export interface CreateProfileInput {
  name: string
  shareOptions?: boolean
  shareConfig?: boolean
  shareResourcepacks?: boolean
  shareShaderpacks?: boolean
}

export type InstanceSubpath = 'mods' | 'config' | 'saves' | 'logs' | 'resourcepacks' | 'shaderpacks' | 'root'

export type MsAuthStage = 'starting' | 'waiting-for-user' | 'exchanging-code' | 'xbox-live' | 'xsts' | 'minecraft' | 'entitlement' | 'profile' | 'done' | 'error'
export interface MsAuthProgress { stage: MsAuthStage; message: string }

export type InstallStage = 'manifest' | 'version-json' | 'client-jar' | 'libraries' | 'natives' | 'assets-index' | 'assets' | 'logging' | 'done'
export interface InstallProgress { versionId: string; stage: InstallStage; current: number; total: number; message: string }

export type LaunchLogType = 'out' | 'err' | 'sys'
export interface LaunchLog { type: LaunchLogType; text: string }
export interface LaunchExit { code: number | null; signal: string | null; durationMs: number }
export interface LaunchStartResult { pid: number }
export interface VersionInstallStatus { installed: boolean; versionId: string }