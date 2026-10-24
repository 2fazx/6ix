import { useEffect, useState } from 'react'
import { Search, Download, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { compact } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardBody } from '../components/ui/Card'
import SelectInstanceModal from '../components/modals/SelectInstanceModal'
import InstallModModal from '../components/instance/InstallModModal'
import type { Instance, ModrinthProject } from '@shared/types'

export default function Discover({ projectType = 'mod', title = 'Mods' }: { projectType?: any, title?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthProject[] | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [projectToInstall, setProjectToInstall] = useState<ModrinthProject | null>(null)
  const [targetInstance, setTargetInstance] = useState<Instance | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.modrinth.search({ query, projectType, sort: query ? 'relevance' : 'downloads', limit: 30 })
        if (!cancelled) {
          setResults(res.hits)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setResults([])
          setLoading(false)
        }
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, projectType])

  const handleInstallClick = (m: ModrinthProject) => {
    const proj = { ...m, project_type: projectType } as any
    setProjectToInstall(proj)
    if (projectType === 'modpack') {
      setTargetInstance({ id: 'new', name: 'New', minecraftVersion: 'any', loader: 'fabric' } as any)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">discover</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-panel px-4 py-2 transition-colors focus-within:border-border-strong">
        <Search size={16} className="text-fg-dim" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="h-8 border-0 bg-transparent text-base focus:border-0" />
        {loading && <Loader2 size={16} className="animate-spin text-fg-dim" />}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {results === null ? (
          Array.from({ length: 9 }).map((_, i) => (
            <Card key={`skeleton-${i}`}><CardBody className="h-32 animate-pulse bg-bg-raised/50" /></Card>
          ))
        ) : results.length === 0 ? (
          <div className="col-span-full py-20 text-center text-sm text-fg-muted">No results found.</div>
        ) : (
          results.map((m, i) => (
            <motion.div key={m.slug || m.id || `mod-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.2 }}>
              <Card className="flex h-full flex-col transition-colors hover:border-border-strong">
                <CardBody className="flex flex-1 flex-col gap-4 py-5">
                  <div className="flex gap-3">
                    {/* GRADIENT REMOVED HERE */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-bg-raised">
                      {m.icon_url ? <img src={m.icon_url} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{m.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-fg-muted">{m.description}</div>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      <span>{compact(m.downloads)} dl</span>
                      <span>·</span>
                      <span className="truncate">{m.author}</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleInstallClick(m)}>
                      <Download size={12} /> Install
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {projectToInstall && !targetInstance && (
        <SelectInstanceModal onClose={() => setProjectToInstall(null)} onSelect={inst => setTargetInstance(inst)} />
      )}

      {projectToInstall && targetInstance && (
        <InstallModModal
          instance={targetInstance.id === 'new' ? undefined : targetInstance}
          project={projectToInstall}
          onClose={() => { setProjectToInstall(null); setTargetInstance(null) }}
          onInstalled={() => { setProjectToInstall(null); setTargetInstance(null) }}
        />
      )}
    </motion.div>
  )
}