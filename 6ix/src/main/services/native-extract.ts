import AdmZip from 'adm-zip'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, sep } from 'node:path'

export async function extractNatives(
  jarPath: string,
  destDir: string,
  exclude: string[] = ['META-INF/']
): Promise<void> {
  const zip = new AdmZip(jarPath)
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    if (exclude.some(ex => entry.entryName.startsWith(ex))) continue
    // Guard against zip-slip
    const target = normalize(join(destDir, entry.entryName))
    if (!target.startsWith(normalize(destDir + sep)) && target !== normalize(destDir)) continue
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, entry.getData())
  }
}