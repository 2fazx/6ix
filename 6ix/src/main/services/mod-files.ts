import { readdir, stat, rename, unlink, copyFile, mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { downloadFile } from './downloader'
import { readFile, writeFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'
import type { ModFile } from '@shared/types'

const META_FILE = '6ix-meta.json'

const safeName = (n: string): string => {
  if (!n || n.includes('/') || n.includes('\\') || n === '..' || n === '.') throw new Error('invalid filename')
  return n
}

export interface ModMeta {
  projectId?: string
  title?: string
  dependencies: string[]
}

export async function listModFiles(instanceDir: string): Promise<ModFile[]> {
  const dir = join(instanceDir, 'mods')
  try {
    const entries = await readdir(dir)
    const out: ModFile[] = []
    for (const name of entries) {
      if (name === META_FILE) continue
      const disabled = name.endsWith('.jar.disabled')
      if (!name.endsWith('.jar') && !disabled) continue
      const full = join(dir, name)
      const st = await stat(full)
      if (!st.isFile()) continue
      out.push({ fileName: name, displayName: disabled ? name.slice(0, -'.disabled'.length) : name, sizeBytes: st.size, enabled: !disabled, mtime: st.mtimeMs })
    }
    return out.sort((a, b) => a.displayName.localeCompare(b.displayName))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
}

export async function toggleModFile(instanceDir: string, fileName: string): Promise<ModFile> {
  const dir = join(instanceDir, 'mods')
  const safe = safeName(fileName)
  const disabled = safe.endsWith('.jar.disabled')
  const target = disabled ? safe.slice(0, -'.disabled'.length) : `${safe}.disabled`
  await rename(join(dir, safe), join(dir, target))
  const list = await listModFiles(instanceDir)
  const found = list.find(m => m.fileName === target)
  if (!found) throw new Error('toggle succeeded but file not found')
  return found
}

export async function deleteModFile(instanceDir: string, fileName: string): Promise<void> {
  const dir = join(instanceDir, 'mods')
  await unlink(join(dir, safeName(fileName)))
}

export async function importModFile(instanceDir: string, sourcePath: string): Promise<ModFile> {
  const name = safeName(basename(sourcePath))
  if (!name.endsWith('.jar')) throw new Error('only .jar files are accepted')
  const dir = join(instanceDir, 'mods')
  await mkdir(dir, { recursive: true })
  const target = join(dir, name)
  await copyFile(sourcePath, target)
  const st = await stat(target)
  return { fileName: name, displayName: name, sizeBytes: st.size, enabled: true, mtime: st.mtimeMs }
}

export async function installModFromUrl(
  instanceDir: string,
  url: string,
  filename: string,
  folder: 'mods' | 'resourcepacks' | 'shaderpacks',
  onProgress?: (received: number, total: number) => void
): Promise<ModFile> {
  const dir = join(instanceDir, folder)
  await mkdir(dir, { recursive: true })
  const safe = safeName(filename.endsWith('.jar') ? filename : folder === 'mods' ? `${filename}.jar` : filename)

  try { await unlink(join(dir, `${safe}.disabled`)) } catch { /* ignore */ }

  const target = join(dir, safe)
  await downloadFile(url, target, onProgress)
  const st = await stat(target)
  return { fileName: safe, displayName: safe, sizeBytes: st.size, enabled: true, mtime: st.mtimeMs }
}

export async function saveModMeta(instanceDir: string, meta: ModMeta): Promise<void> {
  const dir = join(instanceDir, 'mods')
  await mkdir(dir, { recursive: true })
  const metaPath = join(dir, META_FILE)
  let data: ModMeta[] = []
  try { data = JSON.parse(await readFile(metaPath, 'utf8')) } catch { /* ignore */ }
  if (meta.projectId) data = data.filter(m => m.projectId !== meta.projectId)
  data.push(meta)
  await writeFile(metaPath, JSON.stringify(data, null, 2))
}

export async function checkModConflicts(instanceDir: string): Promise<string[]> {
  const modsDir = join(instanceDir, 'mods')
  const conflicts: string[] = []
  
  try {
    const files = await readdir(modsDir)
    const modIds = new Set<string>()
    let hasOptifine = false
    let hasSodium = false

    for (const file of files) {
      if (!file.endsWith('.jar')) continue
      
      if (file.toLowerCase().includes('optifine')) hasOptifine = true
      if (file.toLowerCase().includes('sodium')) hasSodium = true

      try {
        const zip = new AdmZip(join(modsDir, file))
        
        const fabricJson = zip.getEntry('fabric.mod.json')
        if (fabricJson) {
          const data = JSON.parse(fabricJson.getData().toString('utf8'))
          if (data.id) {
            if (modIds.has(data.id)) conflicts.push(`Duplicate mod ID: ${data.id} (${file})`)
            modIds.add(data.id)
          }
        }
        
        const forgeToml = zip.getEntry('META-INF/mods.toml')
        if (forgeToml) {
          const content = forgeToml.getData().toString('utf8')
          const match = content.match(/modId\s*=\s*"([^"]+)"/)
          if (match) {
            const id = match[1]
            if (modIds.has(id)) conflicts.push(`Duplicate mod ID: ${id} (${file})`)
            modIds.add(id)
          }
        }
      } catch { /* ignore corrupt jars */ }
    }

    if (hasOptifine && hasSodium) {
      conflicts.push('OptiFine and Sodium are incompatible. Remove one of them.')
    }
  } catch {
    // no mods folder
  }

  return conflicts
}