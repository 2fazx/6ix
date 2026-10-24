import { ipcMain, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '@shared/ipc-contract'
import { listInstances, getInstance, createInstance, updateInstance, deleteInstance, renameInstance, setLastPlayed, duplicateInstance } from './services/instances'
import { listAccounts, createOfflineAccount, createMicrosoftAccount, deleteAccount, getFreshAccessToken } from './services/accounts'
import { listProfiles, createProfile, deleteProfile, attachProfile, ensureProfileLinks } from './services/profiles'
import { listMinecraftVersions } from './services/minecraft-meta'
import { searchProjects, getProjectVersions } from './services/modrinth'
import { listModFiles, toggleModFile, deleteModFile, importModFile, installModFromUrl, saveModMeta, ModMeta, checkModConflicts } from './services/mod-files'
import { openInstancePath, readInstanceLog } from './services/files'
import { ensureVersionInstalled, isVersionInstalled } from './services/version-installer'
import { buildLaunchArgs } from './services/launch-args'
import { spawnMinecraft, killInstance, listRunning } from './services/launch'
import { tracker } from './services/download-tracker'
import { pingServer } from './services/server-pinger'
import { installModpack } from './services/modpack-installer'
import { listAllScreenshots, deleteScreenshot, setInstanceCover } from './services/screenshots'
import { fetchProfile, uploadSkin, equipCape } from './services/mojang-api'
import { db } from './db'
import { log } from './logger'
import type { AppSettings, CreateInstanceInput, CreateProfileInput, InstanceSubpath, Loader, ModrinthSearchQuery, UpdateInstanceInput } from '@shared/types'

const asString = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || !v.length) throw new Error(`invalid ${field}`)
  return v
}

const asLoader = (v: unknown): Loader => {
  const allowed: Loader[] = ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt']
  if (typeof v !== 'string' || !allowed.includes(v as Loader)) throw new Error('invalid loader')
  return v as Loader
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

const safe = <A extends unknown[], R>(fn: (e: Electron.IpcMainInvokeEvent, ...a: A) => R | Promise<R>) =>
  async (e: Electron.IpcMainInvokeEvent, ...args: A): Promise<Result<R>> => {
    try { return { ok: true, data: await fn(e, ...args) } } 
    catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      log.error('ipc', msg)
      return { ok: false, error: msg }
    }
  }

function readSettings(): AppSettings {
  const defaults: AppSettings = { theme: 'dark', instanceDir: '', javaPath: null, downloadConcurrency: 4, defaultRamMinMb: 1024, defaultRamMaxMb: 4096, discordRpc: false, reduceMotion: false }
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  for (const r of rows) {
    try { (defaults as any)[r.key] = JSON.parse(r.value) } catch { /* ignore */ }
  }
  return defaults
}

function writeSettings(patch: Partial<AppSettings>) {
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  db.transaction(() => { for (const [k, v] of Object.entries(patch)) stmt.run(k, JSON.stringify(v)) })()
}

const getInstanceOrThrow = (id: string) => {
  const inst = getInstance(id)
  if (!inst) throw new Error('instance not found')
  return inst
}

export function registerIpc() {
  // Window Controls
  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('window:maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())

  // Auto Updater
  ipcMain.on('update:restart', () => {
    autoUpdater.quitAndInstall()
  })

  // Instances
  ipcMain.handle(IPC.instancesList, safe(() => listInstances()))
  ipcMain.handle(IPC.instancesGet, safe((_e, id: unknown) => getInstance(asString(id, 'id'))))
  ipcMain.handle(IPC.instancesCreate, safe((_e, input: any) => {
    return createInstance({
      name: asString(input.name, 'name'), minecraftVersion: asString(input.minecraftVersion, 'minecraftVersion'), loader: asLoader(input.loader),
      loaderVersion: typeof input.loaderVersion === 'string' ? input.loaderVersion : null, ramMinMb: typeof input.ramMinMb === 'number' ? input.ramMinMb : undefined,
      ramMaxMb: typeof input.ramMaxMb === 'number' ? input.ramMaxMb : undefined, profileId: typeof input.profileId === 'string' && input.profileId ? input.profileId : null,
      accountId: typeof input.accountId === 'string' && input.accountId ? input.accountId : null
    } as CreateInstanceInput)
  }))
  ipcMain.handle(IPC.instancesUpdate, safe((_e, id: unknown, patch: unknown) => updateInstance(asString(id, 'id'), patch as UpdateInstanceInput)))
  ipcMain.handle(IPC.instancesDelete, safe((_e, id: unknown) => deleteInstance(asString(id, 'id'))))
  ipcMain.handle(IPC.instancesRename, safe((_e, id: unknown, name: unknown) => renameInstance(asString(id, 'id'), asString(name, 'name'))))
  ipcMain.handle('instances:duplicate', safe((_e, id: unknown) => duplicateInstance(asString(id, 'id'))))

  // Accounts
  ipcMain.handle(IPC.accountsList, safe(() => listAccounts()))
  ipcMain.handle(IPC.accountsCreateOffline, safe((_e, username: unknown) => createOfflineAccount(asString(username, 'username'))))
  ipcMain.handle(IPC.accountsMsLogin, safe((e) => createMicrosoftAccount(p => { if (!e.sender.isDestroyed()) e.sender.send(IPC.msAuthProgressEvent, p) })))
  ipcMain.handle(IPC.accountsDelete, safe((_e, id: unknown) => deleteAccount(asString(id, 'id'))))

  // Skins
  ipcMain.handle('skins:get-profile', safe(async (_e, accountId: unknown) => {
    const auth = await getFreshAccessToken(asString(accountId, 'accountId'))
    return fetchProfile(auth.accessToken)
  }))
  ipcMain.handle('skins:upload', safe(async (_e, accountId: unknown) => {
    const auth = await getFreshAccessToken(asString(accountId, 'accountId'))
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() ?? undefined!, { properties: ['openFile'], filters: [{ name: 'PNG Skins', extensions: ['png'] }] })
    if (result.canceled || !result.filePaths[0]) return false
    await uploadSkin(auth.accessToken, result.filePaths[0], 'classic')
    return true
  }))
  ipcMain.handle('skins:equip-cape', safe(async (_e, accountId: unknown, capeId: unknown) => {
    const auth = await getFreshAccessToken(asString(accountId, 'accountId'))
    await equipCape(auth.accessToken, capeId === null ? null : asString(capeId, 'capeId'))
    return true
  }))

  // Profiles
  ipcMain.handle(IPC.profilesList, safe(() => listProfiles()))
  ipcMain.handle(IPC.profilesCreate, safe((_e, input: any) => createProfile({ name: asString(input.name, 'name'), shareOptions: !!input.shareOptions, shareConfig: !!input.shareConfig, shareResourcepacks: !!input.shareResourcepacks, shareShaderpacks: !!input.shareShaderpacks } as CreateProfileInput)))
  ipcMain.handle(IPC.profilesDelete, safe((_e, id: unknown) => deleteProfile(asString(id, 'id'))))
  ipcMain.handle(IPC.profilesAttach, safe((_e, instanceId: unknown, profileId: unknown) => { attachProfile(asString(instanceId, 'instanceId'), profileId === null ? null : asString(profileId, 'profileId')); return true }))

  // Metadata
  ipcMain.handle(IPC.mcVersionsList, safe(() => listMinecraftVersions()))
  ipcMain.handle(IPC.mcVersionStatus, safe((_e, versionId: unknown) => ({ versionId: asString(versionId, 'versionId'), installed: isVersionInstalled(asString(versionId, 'versionId')) })))

  // Modrinth
  ipcMain.handle(IPC.modrinthSearch, safe((_e, q: ModrinthSearchQuery) => {
    const query = q || { projectType: 'mod', sort: 'downloads', limit: 6 }
    if (!['mod', 'modpack', 'resourcepack', 'shader', 'datapack', 'plugin'].includes(query.projectType)) throw new Error('invalid projectType')
    return searchProjects(query)
  }))
  ipcMain.handle(IPC.modrinthVersions, safe((_e, slugOrId: unknown, loaders: unknown, gameVersions: unknown) => {
    return getProjectVersions(asString(slugOrId, 'slugOrId'), Array.isArray(loaders) && loaders.length > 0 ? (loaders as string[]) : undefined, Array.isArray(gameVersions) && gameVersions.length > 0 ? (gameVersions as string[]) : undefined)
  }))
  ipcMain.handle(IPC.modrinthInstall, safe((e, instanceId: unknown, url: unknown, filename: unknown, folder: unknown) => {
    const inst = getInstanceOrThrow(asString(instanceId, 'instanceId'))
    const fileName = asString(filename, 'filename')
    const targetFolder = (typeof folder === 'string' ? folder : 'mods') as 'mods' | 'resourcepacks' | 'shaderpacks'
    return installModFromUrl(inst.directory, asString(url, 'url'), fileName, targetFolder, (received, total) => {
      if (!e.sender.isDestroyed()) e.sender.send(IPC.downloadProgressEvent, { url, filename: fileName, received, total })
    })
  }))

  // Mods
  ipcMain.handle(IPC.modsList, safe((_e, instanceId: unknown) => listModFiles(getInstanceOrThrow(asString(instanceId, 'instanceId')).directory)))
  ipcMain.handle(IPC.modsToggle, safe((_e, instanceId: unknown, fileName: unknown) => toggleModFile(getInstanceOrThrow(asString(instanceId, 'instanceId')).directory, asString(fileName, 'fileName'))))
  ipcMain.handle(IPC.modsDelete, safe(async (_e, instanceId: unknown, fileName: unknown) => { await deleteModFile(getInstanceOrThrow(asString(instanceId, 'instanceId')).directory, asString(fileName, 'fileName')); return true }))
  ipcMain.handle(IPC.modsImport, safe(async (_e, instanceId: unknown) => {
    const inst = getInstanceOrThrow(asString(instanceId, 'instanceId'))
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() ?? undefined!, { properties: ['openFile'], filters: [{ name: 'Mod jars', extensions: ['jar'] }] })
    if (result.canceled || !result.filePaths[0]) return null
    return importModFile(inst.directory, result.filePaths[0])
  }))
  ipcMain.handle('mods:save-meta', safe(async (_e, instanceId: unknown, meta: unknown) => { await saveModMeta(getInstanceOrThrow(asString(instanceId, 'instanceId')).directory, meta as ModMeta); return true }))
  ipcMain.handle('mods:check-conflicts', safe((_e, id: unknown) => checkModConflicts(getInstanceOrThrow(asString(id, 'id')).directory)))

  // Files
  ipcMain.handle(IPC.filesOpenFolder, safe(async (_e, instanceId: unknown, sub: unknown) => {
    const inst = getInstanceOrThrow(asString(instanceId, 'instanceId'))
    const subpath = (typeof sub === 'string' ? sub : 'root') as InstanceSubpath
    await openInstancePath(inst.directory, subpath === 'root' ? undefined : subpath)
    return true
  }))
  ipcMain.handle(IPC.filesReadLog, safe(async (_e, instanceId: unknown) => readInstanceLog(getInstanceOrThrow(asString(instanceId, 'instanceId')).directory)))

  // Settings
  ipcMain.handle(IPC.settingsGet, safe(() => readSettings()))
  ipcMain.handle(IPC.settingsSet, safe((_e, patch: Partial<AppSettings>) => { writeSettings(patch); return readSettings() }))

  // Downloads
  ipcMain.handle('downloads:list', safe(() => tracker.getAll()))
  ipcMain.handle('downloads:clear', safe(() => { tracker.clear(); return true }))
  tracker.on('update', (downloads) => {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) win.webContents.send('downloads:update', downloads)
    })
  })

  // Servers
  ipcMain.handle('servers:ping', safe((_e, host: unknown, port: unknown) => {
    return pingServer(asString(host, 'host'), typeof port === 'number' ? port : 25565)
  }))

  // Modpacks
  ipcMain.handle('modpacks:install', safe(async (e, url: unknown, name: unknown) => {
    return installModpack(asString(url, 'url'), asString(name, 'name'), (progress) => {
      if (!e.sender.isDestroyed()) e.sender.send(IPC.installProgressEvent, progress)
    })
  }))

  // Screenshots
  ipcMain.handle('screenshots:list', safe(() => listAllScreenshots()))
  ipcMain.handle('screenshots:delete', safe((_e, path: unknown) => deleteScreenshot(asString(path, 'path'))))
  ipcMain.handle('screenshots:set-cover', safe(async (_e, instanceId: unknown, path: unknown) => {
    await setInstanceCover(asString(instanceId, 'instanceId'), asString(path, 'path'))
    return true
  }))

  // Launch
  ipcMain.handle(IPC.launchStart, safe(async (e, instanceId: unknown) => {
    const inst = getInstanceOrThrow(asString(instanceId, 'instanceId'))
    if (!inst.accountId) throw new Error('Instance has no account assigned.')
    const sender = e.sender
    const sendLog = (logData: { type: 'out' | 'err' | 'sys'; text: string }) => { if (!sender.isDestroyed()) sender.send(IPC.launchLogEvent, logData) }

    try {
      sendLog({ type: 'sys', text: 'Checking version files...\n' })
      const installed = await ensureVersionInstalled(inst.minecraftVersion, inst.loader, inst.loaderVersion, (progress) => {
        if (!sender.isDestroyed()) sender.send(IPC.installProgressEvent, progress)
      })
      if (inst.profileId) ensureProfileLinks(inst.directory, inst.profileId)
      
      sendLog({ type: 'sys', text: 'Building launch arguments...\n' })
      const cmd = await buildLaunchArgs(inst, installed)
      
      sendLog({ type: 'sys', text: `Spawning Java process (${cmd.java})...\n` })
      const { pid } = spawnMinecraft({
        instanceId: inst.id, java: cmd.java, args: cmd.args, cwd: cmd.cwd, onLog: sendLog,
        onExit: (exit) => { setLastPlayed(inst.id, exit.durationMs); if (!sender.isDestroyed()) sender.send(IPC.launchExitEvent, exit) }
      })
      setLastPlayed(inst.id, 0)
      return { pid }
    } catch (err) {
      sendLog({ type: 'sys', text: `Launch failed: ${String(err)}\n` })
      throw err
    }
  }))

  ipcMain.handle(IPC.launchKill, safe((_e, instanceId: unknown) => killInstance(asString(instanceId, 'instanceId'))))
  ipcMain.handle(IPC.launchStatus, safe(() => listRunning()))
}