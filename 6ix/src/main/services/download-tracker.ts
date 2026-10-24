import { EventEmitter } from 'node:events'

export interface GlobalDownload {
  id: string
  name: string
  received: number
  total: number
  speed: number
  status: 'downloading' | 'done' | 'error'
}

class DownloadTracker extends EventEmitter {
  private downloads = new Map<string, GlobalDownload>()
  private lastUpdate = new Map<string, { bytes: number; time: number }>()

  add(id: string, name: string) {
    this.downloads.set(id, { id, name, received: 0, total: 0, speed: 0, status: 'downloading' })
    this.lastUpdate.set(id, { bytes: 0, time: Date.now() })
    this.emit('update', Array.from(this.downloads.values()))
  }

  update(id: string, received: number, total: number) {
    const d = this.downloads.get(id)
    if (!d) return
    
    const now = Date.now()
    const last = this.lastUpdate.get(id)!
    const timeDiff = (now - last.time) / 1000
    
    if (timeDiff >= 0.5) {
      d.speed = (received - last.bytes) / timeDiff
      this.lastUpdate.set(id, { bytes: received, time: now })
    }

    d.received = received
    d.total = total
    this.emit('update', Array.from(this.downloads.values()))
  }

  finish(id: string) {
    const d = this.downloads.get(id)
    if (d) { d.status = 'done'; d.speed = 0 }
    this.emit('update', Array.from(this.downloads.values()))
  }

  error(id: string) {
    const d = this.downloads.get(id)
    if (d) { d.status = 'error'; d.speed = 0 }
    this.emit('update', Array.from(this.downloads.values()))
  }

  getAll() { return Array.from(this.downloads.values()) }
  clear() { this.downloads.clear(); this.emit('update', []) }
}

export const tracker = new DownloadTracker()