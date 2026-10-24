import { useEffect, useState } from 'react'
import { Camera, Trash2, Image as ImageIcon, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

interface Shot {
  id: string
  instanceId: string
  instanceName: string
  path: string
  filename: string
  mtime: number
}

export default function Screenshots() {
  const [shots, setShots] = useState<Shot[] | null>(null)
  const [selected, setSelected] = useState<Shot | null>(null)

  const refresh = () => api.screenshots.list().then(setShots)

  useEffect(() => {
    refresh()
  }, [])

  const remove = async (path: string) => {
    if (!confirm('Delete this screenshot?')) return
    await api.screenshots.delete(path)
    await refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">gallery</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Screenshots</h1>
      </div>

      {shots === null ? (
        <div className="py-20 text-center text-xs text-fg-dim">Scanning instances...</div>
      ) : shots.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-raised"><Camera size={24} className="text-fg-muted" /></div>
            <div className="text-sm text-fg">No screenshots found</div>
            <div className="max-w-xs text-xs text-fg-muted">Take screenshots in-game (F2) and they will appear here.</div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {shots.map(shot => (
            <motion.div key={shot.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
              <div className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-bg-raised cursor-pointer" onClick={() => setSelected(shot)}>
                <img src={`6ix-media://${shot.path}`} alt={shot.filename} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="truncate text-xs font-medium text-white">{shot.instanceName}</div>
                  <div className="truncate font-mono text-[10px] text-white/60">{shot.filename}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative max-h-full max-w-full overflow-hidden rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <img src={`6ix-media://${selected.path}`} alt={selected.filename} className="max-h-[85vh] max-w-full object-contain" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent p-4">
                <div>
                  <div className="text-sm font-medium text-white">{selected.instanceName}</div>
                  <div className="font-mono text-xs text-white/60">{selected.filename}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={async () => {
                    await api.screenshots.setCover(selected.instanceId, selected.path)
                    alert('Set as instance cover!')
                  }}>
                    <ImageIcon size={14} /> Set as Cover
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => { remove(selected.path); setSelected(null) }}>
                    <Trash2 size={14} /> Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}