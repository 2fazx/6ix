import { createWriteStream } from 'node:fs'
import { mkdir, rename, unlink, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { tracker } from './download-tracker'

const UA = '6IX-Launcher/0.1 (https://github.com/6ix-launcher)'

export async function downloadFile(
  url: string,
  targetPath: string,
  onProgress?: (received: number, total: number) => void
): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status} ${res.statusText}`)

  const total = Number(res.headers.get('content-length') ?? 0)
  await mkdir(dirname(targetPath), { recursive: true })

  const tmp = `${targetPath}.${randomUUID()}.part`
  const ws = createWriteStream(tmp)
  const reader = res.body.getReader()
  let received = 0

  const id = randomUUID()
  const name = targetPath.split(/[\\/]/).pop() || 'file'
  
  // Track it globally
  tracker.add(id, name)

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      await new Promise<void>((resolve, reject) =>
        ws.write(value, err => (err ? reject(err) : resolve()))
      )
      received += value.length
      onProgress?.(received, total)
      tracker.update(id, received, total)
    }
    await new Promise<void>((resolve, reject) => ws.end(err => (err ? reject(err) : resolve())))

    try {
      await rename(tmp, targetPath)
      tracker.finish(id)
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException
      if (nodeErr.code === 'EPERM' || nodeErr.code === 'EEXIST') {
        try {
          await stat(targetPath)
          await unlink(tmp)
          tracker.finish(id)
        } catch {
          tracker.error(id)
          throw err
        }
      } else {
        tracker.error(id)
        throw err
      }
    }
  } catch (e) {
    try { ws.close() } catch { /* ignore */ }
    try { await unlink(tmp) } catch { /* ignore */ }
    tracker.error(id)
    throw e
  }
}