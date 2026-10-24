import { useState } from 'react'
import { Server, Plus, Loader2, Users, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardBody } from '../components/ui/Card'

export default function Servers() {
  const [servers, setServers] = useState<{ host: string; status: any; loading: boolean }[]>([])
  const [input, setInput] = useState('')

  const addServer = async () => {
    if (!input.trim()) return
    const host = input.trim()
    setInput('')
    setServers(prev => [...prev, { host, status: null, loading: true }])

    const status = await api.servers.ping(host)
    setServers(prev => prev.map(s => s.host === host ? { ...s, status, loading: false } : s))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">multiplayer</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Servers</h1>
      </div>

      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="play.hypixel.net" onKeyDown={e => e.key === 'Enter' && addServer()} />
        <Button variant="primary" onClick={addServer} disabled={!input.trim()}><Plus size={14} /> Add</Button>
      </div>

      <div className="flex flex-col gap-3">
        {servers.map(s => (
          <Card key={s.host} className="transition-colors hover:border-border-strong">
            <CardBody className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-bg-raised">
                  <Server size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium">{s.host}</div>
                  {s.loading ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted"><Loader2 size={12} className="animate-spin" /> Pinging...</div>
                  ) : s.status?.online ? (
                    <div className="mt-1 flex items-center gap-3 text-xs text-fg-muted">
                      <span className="flex items-center gap-1"><Users size={12} /> {s.status.players.online}/{s.status.players.max}</span>
                      <span className="flex items-center gap-1"><Wifi size={12} /> {s.status.ping}ms</span>
                      <span className="truncate max-w-[200px]">{s.status.motd}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-red-400">Offline</div>
                  )}
                </div>
              </div>
              <Button variant="secondary" size="sm" disabled={!s.status?.online}>Play</Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}