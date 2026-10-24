import { useEffect, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/shell/Sidebar'
import CommandPalette from './components/shell/CommandPalette'
import ParticleBackground from './components/ui/ParticleBackground'
import TitleBar from './components/shell/TitleBar'
import Router from './router'
import { api } from './lib/api'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [palette, setPalette] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(p => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const offDown = api.update?.onDownloaded(() => setUpdateReady(true))
    return () => offDown?.()
  }, [])

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-transparent text-fg">
      <ParticleBackground />
      <TitleBar />
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-10 py-8">
            <Router />
          </div>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />

      <AnimatePresence>
        {updateReady && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="absolute bottom-6 right-6 z-50 flex items-center gap-4 rounded-xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400">
              <Download size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Update Ready</div>
              <div className="text-xs text-fg-muted">Restart to apply the latest features.</div>
            </div>
            <button
              onClick={() => api.update.restart()}
              className="ml-4 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-gray-200"
            >
              <RefreshCw size={14} /> Restart
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}