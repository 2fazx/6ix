import { app } from 'electron'
import { createWriteStream, mkdirSync } from 'node:fs'
import { join } from 'node:path'

mkdirSync(join(app.getPath('userData'), 'logs'), { recursive: true })
const stream = createWriteStream(join(app.getPath('userData'), 'logs', 'main.log'), { flags: 'a' })

const stamp = () => new Date().toISOString()

export const log = {
  info: (m: string, ...a: unknown[]) => stream.write(`[${stamp()}] INFO ${m} ${a.map(String).join(' ')}\n`),
  warn: (m: string, ...a: unknown[]) => stream.write(`[${stamp()}] WARN ${m} ${a.map(String).join(' ')}\n`),
  error: (m: string, ...a: unknown[]) => stream.write(`[${stamp()}] ERR  ${m} ${a.map(String).join(' ')}\n`)
}