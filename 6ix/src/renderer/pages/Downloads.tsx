import { useEffect, useState } from 'react'
import { Download, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { bytes } from '../lib/format'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function Downloads() {
  const [downloads, setDownloads] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Safety check: if the preload script didn't load the downloads API, don't crash
    if (!api.downloads) {
      setError('Download manager is not connected.')
      return
    }

    api.downloads.list().then(setDownloads).catch(e => setError(e.message))
    const off = api.downloads.onUpdate(setDownloads)
    return off
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">queue</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Downloads</h1>
        </div>
        {downloads.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => api.downloads?.clear()}>
            <Trash2 size={14} /> Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded border border-border-strong bg-bg-panel px-3 py-2 text-xs text-fg-muted">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {downloads.map(d => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardBody className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-bg-raised">
                    {d.status === 'downloading' && <Loader2 size={16} className="animate-spin" />}
                    {d.status === 'done' && <CheckCircle2 size={16} className="text-green-500" />}
                    {d.status === 'error' && <XCircle size={16} className="text-red-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.name}</div>
                    <div className="mt-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      <span>{bytes(d.received)} / {bytes(d.total)}</span>
                      {d.status === 'downloading' && d.speed > 0 && <span>{bytes(d.speed)}/s</span>}
                    </div>
                    {d.status === 'downloading' && (
                      <div className="mt-2 h-1 w-full overflow-hidden rounded bg-border">
                        <div className="h-full bg-fg transition-all" style={{ width: `${d.total > 0 ? (d.received / d.total) * 100 : 0}%` }} />
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {downloads.length === 0 && !error && (
          <Card>
            <CardBody className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-raised"><Download size={24} className="text-fg-muted" /></div>
              <div className="text-sm text-fg">No active downloads</div>
              <div className="max-w-xs text-xs text-fg-muted">Files from Modrinth and Minecraft installations will appear here.</div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}