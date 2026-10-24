import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import AdmZip from 'adm-zip'
import { PATHS } from '../paths'
import { downloadFile } from './downloader'
import { log } from '../logger'

export async function getJavaPath(majorVersion: number = 21): Promise<string> {
  const javaDir = join(PATHS.data(), 'java')
  const zipPath = join(javaDir, `java-${majorVersion}.zip`)
  mkdirSync(javaDir, { recursive: true })

  const extractedDir = join(javaDir, `jre-${majorVersion}`)
  mkdirSync(extractedDir, { recursive: true })

  // 1. Check if we already have a valid java.exe
  try {
    const entries = readdirSync(extractedDir)
    const rootFolder = entries.find(e => e.startsWith('jdk-') || e.startsWith('jre-'))
    if (rootFolder) {
      const possibleExe = join(extractedDir, rootFolder, 'bin', 'java.exe')
      if (existsSync(possibleExe)) {
        return possibleExe
      }
    }
  } catch {
    /* folder empty, ignore */
  }

  // 2. Download Java if missing
  if (!existsSync(zipPath)) {
    log.info(`downloading java ${majorVersion} runtime from adoptium...`)
    const url = `https://api.adoptium.net/v3/binary/latest/${majorVersion}/ga/windows/x64/jre/hotspot/normal/eclipse`
    await downloadFile(url, zipPath)
  }

  // 3. Extract
  log.info(`extracting java ${majorVersion} runtime...`)
  const zip = new AdmZip(zipPath)
  zip.extractAllTo(extractedDir, true)

  // 4. Find the executable inside the extracted folder
  const entries = readdirSync(extractedDir)
  const rootFolder = entries.find(e => e.startsWith('jdk-') || e.startsWith('jre-'))

  if (rootFolder) {
    const realJavaPath = join(extractedDir, rootFolder, 'bin', 'java.exe')
    if (existsSync(realJavaPath)) {
      return realJavaPath
    }
  }

  throw new Error(`Failed to locate java.exe after extraction for Java ${majorVersion}.`)
}