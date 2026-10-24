import { readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { getInstance, listInstances, updateInstance } from './instances'

export interface Screenshot {
  id: string
  instanceId: string
  instanceName: string
  path: string
  filename: string
  mtime: number
}

export async function listAllScreenshots(): Promise<Screenshot[]> {
  const instances = listInstances()
  const out: Screenshot[] = []

  for (const inst of instances) {
    const dir = join(inst.directory, 'screenshots')
    try {
      const files = await readdir(dir)
      for (const file of files) {
        if (!file.endsWith('.png') && !file.endsWith('.jpg')) continue
        const full = join(dir, file)
        const st = await stat(full)
        out.push({
          id: full,
          instanceId: inst.id,
          instanceName: inst.name,
          path: full,
          filename: file,
          mtime: st.mtimeMs
        })
      }
    } catch {
      // no screenshots folder
    }
  }

  return out.sort((a, b) => b.mtime - a.mtime)
}

export async function deleteScreenshot(path: string): Promise<boolean> {
  try {
    await unlink(path)
    return true
  } catch {
    return false
  }
}

export async function setInstanceCover(instanceId: string, imagePath: string): Promise<void> {
  updateInstance(instanceId, { iconPath: imagePath })
}