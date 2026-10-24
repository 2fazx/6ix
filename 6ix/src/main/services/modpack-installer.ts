import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import AdmZip from 'adm-zip'
import { PATHS } from '../paths'
import { createInstance } from './instances'
import { downloadFile } from './downloader'
import { randomUUID } from 'node:crypto'
import type { InstallProgress } from '@shared/types'

interface MrpackIndex {
  formatVersion: number
  game: string
  versionId: string
  name: string
  files: { path: string; hashes: { sha1: string; sha512: string }; env?: any; downloads: string[]; fileSize: number }[]
  dependencies: { minecraft: string; fabric?: string; forge?: string; neoforge?: string }
}

export async function installModpack(url: string, name: string, onProgress: (p: InstallProgress) => void) {
  const tempZip = join(PATHS.cache(), `${randomUUID()}.mrpack`)
  onProgress({ versionId: name, stage: 'manifest', current: 0, total: 1, message: 'Downloading modpack...' })
  await downloadFile(url, tempZip)

  const zip = new AdmZip(tempZip)
  const indexFile = zip.getEntry('modrinth.index.json')
  if (!indexFile) throw new Error('Invalid .mrpack file')
  
  const index = JSON.parse(indexFile.getData().toString('utf8')) as MrpackIndex
  
  const loader = index.dependencies.fabric ? 'fabric' : index.dependencies.forge ? 'forge' : 'vanilla'
  const loaderVer = index.dependencies.fabric || index.dependencies.forge || null

  const inst = createInstance({
    name: index.name || name,
    minecraftVersion: index.dependencies.minecraft,
    loader: loader as any,
    loaderVersion: loaderVer,
  })

  const totalFiles = index.files.length
  let done = 0

  onProgress({ versionId: inst.id, stage: 'libraries', current: 0, total: totalFiles, message: 'Downloading modpack files...' })

  const pool = async (concurrency: number) => {
    const next = { i: 0 }
    const worker = async () => {
      while (next.i < totalFiles) {
        const file = index.files[next.i++]
        const target = join(inst.directory, file.path)
        await mkdir(dirname(target), { recursive: true })
        
        const downloadUrl = file.downloads[0]
        if (downloadUrl) {
          await downloadFile(downloadUrl, target)
        }
        
        done++
        onProgress({ versionId: inst.id, stage: 'libraries', current: done, total: totalFiles, message: `Downloading files (${done}/${totalFiles})` })
      }
    }
    await Promise.all(Array.from({ length: concurrency }).map(worker))
  }

  await pool(6)
  onProgress({ versionId: inst.id, stage: 'done', current: 1, total: 1, message: 'Modpack ready!' })
  return inst
}