import { useEffect, useState } from 'react'
import { Search, Download, ChevronLeft, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'
import { compact, bytes } from '../../lib/format'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import type { Instance, ModrinthProject, ModrinthVersion } from '@shared/types'

export default function InstallModModal({
  instance,
  project: initialProject,
  onClose,
  onInstalled
}: {
  instance?: Instance
  project?: ModrinthProject
  onClose: () => void
  onInstalled: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ModrinthProject[] | null>(initialProject ? [initialProject] : null)
  const [project, setProject] = useState<ModrinthProject | null>(initialProject || null)
  const [versions, setVersions] = useState<ModrinthVersion[] | null>(null)
  
  const [installing, setInstalling] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modpackName, setModpackName] = useState('')

  const pType = (project as any)?.project_type || (initialProject as any)?.projectType || 'mod'
  const isModpack = pType === 'modpack'

  // Search
  useEffect(() => {
    if (project) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await api.modrinth.search({
          query,
          projectType: (initialProject as any)?.projectType || 'mod',
          loader: instance?.loader && instance.loader !== 'vanilla' ? instance.loader : undefined,
          gameVersion: instance?.minecraftVersion || undefined,
          sort: query ? 'relevance' : 'downloads',
          limit: 20
        })
        if (!cancelled) setResults(res.hits)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed')
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, project, instance, initialProject])

  // Fetch versions
  useEffect(() => {
    if (!project) return
    let cancelled = false
    setVersions(null)
    ;(async () => {
      try {
        const safeLoader = instance?.loader || 'vanilla'
        const safeVersion = instance?.minecraftVersion || '1.20.1'
        const loaders = !isModpack && safeLoader !== 'vanilla' ? [safeLoader] : []
        const gameVersions = !isModpack && safeVersion ? [safeVersion] : []
        const projectId = project.slug || project.id || ''
        const v = await api.modrinth.versions(projectId, loaders, gameVersions)
        if (!cancelled) setVersions(v)
        if (!cancelled && isModpack && !modpackName) setModpackName(project.title)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed')
      }
    })()
    return () => { cancelled = true }
  }, [project, instance, isModpack])

  useEffect(() => {
    const off = api.onDownloadProgress(p => setProgress({ received: p.received, total: p.total }))
    return off
  }, [])

  const install = async (v: ModrinthVersion) => {
    setInstalling(v.id)
    setError(null)
    setProgress(null)
    setStatusText('Resolving dependencies…')

    try {
      const primary = v.files.find(f => f.primary) ?? v.files[0]
      if (!primary || !primary.url || !primary.filename) throw new Error('This version has no downloadable file.')

      if (isModpack) {
        setStatusText('Installing modpack...')
        await api.modpacks.install(primary.url, modpackName || project?.title || 'Modpack')
        onInstalled()
        return
      }

      if (!instance) throw new Error('No instance selected for installation.')

      const safeLoader = instance.loader || 'vanilla'
      const safeVersion = instance.minecraftVersion || '1.20.1'
      const loaders = safeLoader !== 'vanilla' ? [safeLoader] : []
      const gameVersions = safeVersion ? [safeVersion] : []

      const reqDeps = v.dependencies?.filter(d => d.dependency_type === 'required' && d.project_id) || []
      for (const dep of reqDeps) {
        setStatusText(`Installing dependency…`)
        const depId = dep.project_id || ''
        if (!depId) continue
        const depVersions = await api.modrinth.versions(depId, loaders, gameVersions)
        if (depVersions.length > 0) {
          const depFile = depVersions[0].files.find(f => f.primary) ?? depVersions[0].files[0]
          if (depFile && depFile.url && depFile.filename) {
            await api.modrinth.install(instance.id, depFile.url, depFile.filename, 'mods')
          }
        }
      }

      setStatusText('Installing main mod…')
      const folder = pType === 'resourcepack' ? 'resourcepacks' : pType === 'shader' ? 'shaderpacks' : 'mods'
      await api.modrinth.install(instance.id, primary.url, primary.filename, folder)
      
      if (folder === 'mods') {
        const safeProjectId = project?.slug || project?.id || 'unknown'
        const safeTitle = project?.title || 'Unknown'
        const safeDeps = reqDeps.map(d => d.project_id).filter(Boolean) as string[]
        await api.mods.saveMeta(instance.id, { projectId: safeProjectId, title: safeTitle, dependencies: safeDeps })
      }

      onInstalled()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to install')
    } finally {
      setInstalling(null)
      setProgress(null)
    }
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-[8vh]" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-h-[80vh] w-[720px] flex-col overflow-hidden rounded-lg border border-border-strong bg-bg-panel shadow-2xl" 
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              {project && !initialProject && (
                <button onClick={() => setProject(null)} className="rounded p-1 text-fg-muted hover:text-fg">
                  <ChevronLeft size={16} />
                </button>
              )}
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">
                {project ? 'select version' : 'install'}
              </div>
              {project && <div className="ml-2 truncate text-sm font-medium">{project.title}</div>}
            </div>
            <div className="flex gap-1.5">
              {!isModpack && instance && (
                <>
                  <Badge>{instance.loader || 'vanilla'}</Badge>
                  <Badge>{instance.minecraftVersion || 'unknown'}</Badge>
                </>
              )}
              {isModpack && <Badge>modpack</Badge>}
            </div>
          </div>

          {!project && (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search size={14} className="text-fg-dim" />
                <Input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="search mods…" className="border-0 bg-transparent focus:border-0" />
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {results === null ? (
                  <li className="py-12 text-center text-xs text-fg-dim">searching…</li>
                ) : results.length === 0 ? (
                  <li className="py-12 text-center text-xs text-fg-dim">no results</li>
                ) : (
                  results.map((r, i) => (
                    <li key={r.slug || r.id || `res-${i}`}>
                      <button onClick={() => setProject(r)} className="flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-bg-hover">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-border bg-bg-raised">
                          {r.icon_url && <img src={r.icon_url} alt="" className="h-full w-full object-cover grayscale" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{r.title}</div>
                          <div className="line-clamp-1 text-xs text-fg-muted">{r.description}</div>
                          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                            <span>{compact(r.downloads)} dl</span>
                            <span>·</span>
                            <span>{r.author}</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}

          {project && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isModpack && (
                <div className="border-b border-border bg-bg-raised px-5 py-3">
                  <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">New Instance Name</div>
                  <Input value={modpackName} onChange={e => setModpackName(e.target.value)} placeholder={project.title} />
                </div>
              )}

              {versions === null ? (
                <div className="py-12 text-center text-xs text-fg-dim">loading versions…</div>
              ) : versions.length === 0 ? (
                <div className="py-12 text-center text-xs text-fg-dim">no compatible versions</div>
              ) : (
                <ul className="divide-y divide-border">
                  {versions.map(v => {
                    const primary = v.files.find(f => f.primary) ?? v.files[0]
                    return (
                      <li key={v.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{v.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                            <span>{v.version_number}</span>
                            <span>·</span>
                            <span>{v.loaders.join(', ')}</span>
                            {primary && <><span>·</span><span>{bytes(primary.size)}</span></>}
                          </div>
                        </div>
                        <Button variant="primary" size="sm" onClick={() => install(v)} disabled={installing !== null}>
                          {installing === v.id ? (
                            <><Loader2 size={12} className="animate-spin" /> {progress ? `${Math.round((progress.received / Math.max(progress.total, 1)) * 100)}%` : statusText}</>
                          ) : (
                            <><Download size={12} /> install</>
                          )}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {error && <div className="border-t border-border-strong bg-bg-raised px-5 py-2 text-xs text-fg-muted">{error}</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}