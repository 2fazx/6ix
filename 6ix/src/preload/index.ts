import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { Account, AppSettings, CreateInstanceInput, CreateProfileInput, DownloadProgress, Instance, InstanceSubpath, MinecraftVersionSummary, ModFile, ModrinthSearchHit, ModrinthSearchQuery, ModrinthVersion, MsAuthProgress, Profile, UpdateInstanceInput } from '@shared/types'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

function sanitize(obj: any): any {
  if (obj === undefined || obj === null) return ''
  if (typeof obj === 'object') {
    try { return JSON.parse(JSON.stringify(obj)) } catch { return obj }
  }
  return obj
}

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const safeArgs = args.map(sanitize)
  try {
    const res = (await ipcRenderer.invoke(channel, ...safeArgs)) as Result<T>
    if (!res.ok) throw new Error(res.error)
    return res.data
  } catch (err) {
    console.error(`[IPC ERROR] ${channel}`, args, err)
    throw err
  }
}

const api = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  update: {
    restart: () => ipcRenderer.send('update:restart'),
    onAvailable: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('update:available', handler)
      return () => ipcRenderer.removeListener('update:available', handler)
    },
    onDownloaded: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('update:downloaded', handler)
      return () => ipcRenderer.removeListener('update:downloaded', handler)
    }
  },
  instances: {
    list: () => call<Instance[]>(IPC.instancesList),
    get: (id: string) => call<Instance | null>(IPC.instancesGet, id),
    create: (input: CreateInstanceInput) => call<Instance>(IPC.instancesCreate, input),
    update: (id: string, patch: UpdateInstanceInput) => call<Instance>(IPC.instancesUpdate, id, patch),
    delete: (id: string) => call<boolean>(IPC.instancesDelete, id),
    rename: (id: string, name: string) => call<boolean>(IPC.instancesRename, id, name),
    duplicate: (id: string) => call<Instance>('instances:duplicate', id)
  },
  accounts: {
    list: () => call<Account[]>(IPC.accountsList),
    createOffline: (username: string) => call<Account>(IPC.accountsCreateOffline, username),
    createMicrosoft: () => call<Account>(IPC.accountsMsLogin),
    delete: (id: string) => call<boolean>(IPC.accountsDelete, id)
  },
  skins: {
    getProfile: (accountId: string) => call<any>('skins:get-profile', accountId),
    upload: (accountId: string) => call<boolean>('skins:upload', accountId),
    equipCape: (accountId: string, capeId: string | null) => call<boolean>('skins:equip-cape', accountId, capeId)
  },
  profiles: {
    list: () => call<Profile[]>(IPC.profilesList),
    create: (input: CreateProfileInput) => call<Profile>(IPC.profilesCreate, input),
    delete: (id: string) => call<boolean>(IPC.profilesDelete, id),
    attach: (instanceId: string, profileId: string | null) => call<boolean>(IPC.profilesAttach, instanceId, profileId ?? '')
  },
  mc: {
    versions: () => call<MinecraftVersionSummary[]>(IPC.mcVersionsList),
    versionStatus: (versionId: string) => call<{ installed: boolean; versionId: string }>(IPC.mcVersionStatus, versionId)
  },
  modrinth: {
    search: (q: ModrinthSearchQuery) => call<ModrinthSearchHit>(IPC.modrinthSearch, q),
    versions: (slugOrId: string, loaders: string[] = [], gameVersions: string[] = []) => call<ModrinthVersion[]>(IPC.modrinthVersions, String(slugOrId || ''), loaders, gameVersions),
    install: (instanceId: string, url: string, filename: string, folder: string = 'mods') => call<ModFile>(IPC.modrinthInstall, String(instanceId || ''), String(url || ''), String(filename || ''), folder)
  },
  mods: {
    list: (instanceId: string) => call<ModFile[]>(IPC.modsList, instanceId),
    toggle: (instanceId: string, fileName: string) => call<ModFile>(IPC.modsToggle, instanceId, fileName),
    delete: (instanceId: string, fileName: string) => call<boolean>(IPC.modsDelete, instanceId, fileName),
    import: (instanceId: string) => call<ModFile | null>(IPC.modsImport, instanceId),
    saveMeta: (instanceId: string, meta: any) => call<boolean>('mods:save-meta', String(instanceId || ''), meta),
    checkConflicts: (instanceId: string) => call<string[]>('mods:check-conflicts', instanceId)
  },
  files: {
    openFolder: (instanceId: string, sub: InstanceSubpath = 'root') => call<boolean>(IPC.filesOpenFolder, instanceId, sub),
    readLog: (instanceId: string) => call<string | null>(IPC.filesReadLog, instanceId)
  },
  settings: {
    get: () => call<AppSettings>(IPC.settingsGet),
    set: (patch: Partial<AppSettings>) => call<AppSettings>(IPC.settingsSet, patch)
  },
  downloads: {
    list: () => call<any[]>('downloads:list'),
    clear: () => call<boolean>('downloads:clear'),
    onUpdate: (cb: (downloads: any[]) => void) => {
      const handler = (_: unknown, downloads: any[]) => cb(downloads)
      ipcRenderer.on('downloads:update', handler)
      return () => ipcRenderer.removeListener('downloads:update', handler)
    }
  },
  servers: {
    ping: (host: string, port?: number) => call<any>('servers:ping', host, port || 25565)
  },
  modpacks: {
    install: (url: string, name: string) => call<any>('modpacks:install', url, name)
  },
  screenshots: {
    list: () => call<any[]>('screenshots:list'),
    delete: (path: string) => call<boolean>('screenshots:delete', path),
    setCover: (instanceId: string, path: string) => call<boolean>('screenshots:set-cover', instanceId, path)
  },
  onDownloadProgress: (cb: (p: DownloadProgress) => void) => {
    const handler = (_: unknown, p: DownloadProgress) => cb(p)
    ipcRenderer.on(IPC.downloadProgressEvent, handler)
    return () => ipcRenderer.removeListener(IPC.downloadProgressEvent, handler)
  },
  onMsAuthProgress: (cb: (p: MsAuthProgress) => void) => {
    const handler = (_: unknown, p: MsAuthProgress) => cb(p)
    ipcRenderer.on(IPC.msAuthProgressEvent, handler)
    return () => ipcRenderer.removeListener(IPC.msAuthProgressEvent, handler)
  },
  launch: {
    start: (instanceId: string) => call<{ pid: number }>(IPC.launchStart, instanceId),
    kill: (instanceId: string) => call<boolean>(IPC.launchKill, instanceId),
    status: () => call<string[]>(IPC.launchStatus),
    onLog: (cb: (log: any) => void) => {
      const handler = (_: unknown, log: any) => cb(log)
      ipcRenderer.on(IPC.launchLogEvent, handler)
      return () => ipcRenderer.removeListener(IPC.launchLogEvent, handler)
    },
    onExit: (cb: (exit: any) => void) => {
      const handler = (_: unknown, exit: any) => cb(exit)
      ipcRenderer.on(IPC.launchExitEvent, handler)
      return () => ipcRenderer.removeListener(IPC.launchExitEvent, handler)
    }
  }
}

contextBridge.exposeInMainWorld('six', api)
export type SixApi = typeof api