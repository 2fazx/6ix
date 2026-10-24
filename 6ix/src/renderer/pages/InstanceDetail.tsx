import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FolderOpen, FileText, Trash2, Play, Settings2, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { relative } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import ModsTab from '../components/instance/ModsTab'
import SettingsTab from '../components/instance/SettingsTab'
import LogsTab from '../components/instance/LogsTab'
import LaunchModal from '../components/instance/LaunchModal'
import type { Instance } from '@shared/types'

type Tab = 'overview' | 'mods' | 'settings' | 'logs'

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [instance, setInstance] = useState<Instance | null | undefined>(undefined)
  const [tab, setTab] = useState<Tab>('overview')
  const [error, setError] = useState<string | null>(null)
  const [showLaunch, setShowLaunch] = useState(false)

  const refresh = async () => {
    if (!id) return
    try {
      const inst = await api.instances.get(id)
      setInstance(inst)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    }
  }

  useEffect(() => { refresh() }, [id])

  const remove = async () => {
    if (!id || !instance) return
    if (!confirm(`Delete instance "${instance.name}"? The game directory stays on disk.`)) return
    await api.instances.delete(id)
    nav('/instances')
  }

  const duplicate = async () => {
    if (!id) return
    try {
      const newInst = await api.instances.duplicate(id)
      nav(`/instances/${newInst.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    }
  }

  const openFolder = async (sub: 'root' | 'mods' | 'logs' | 'config' | 'saves') => {
    if (!id) return
    try { await api.files.openFolder(id, sub) } catch (e) { setError(e instanceof Error ? e.message : 'failed') }
  }

  if (instance === undefined) return <div className="flex flex-col gap-6"><Skeleton className="h-6 w-32" /><Skeleton className="h-40 w-full" /></div>

  if (instance === null) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/instances" className="inline-flex items-center gap-2 text-xs text-fg-muted hover:text-fg"><ArrowLeft size={14} /> back to instances</Link>
        <Card><CardBody className="py-14 text-center text-sm text-fg-muted">Instance not found.</CardBody></Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-6">
      <Link to="/instances" className="inline-flex items-center gap-2 text-xs text-fg-muted hover:text-fg"><ArrowLeft size={14} /> back to instances</Link>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">instance</div>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{instance.name}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>{instance.minecraftVersion}</Badge>
              <Badge>{instance.loader}</Badge>
              {instance.loaderVersion && <Badge>loader {instance.loaderVersion}</Badge>}
              <Badge>{instance.ramMaxMb}M</Badge>
              {instance.profileId && <Badge>shared profile</Badge>}
              <Badge>last played · {relative(instance.lastPlayedAt)}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={duplicate}><Copy size={14} /> Duplicate</Button>
            <Button variant="primary" onClick={() => setShowLaunch(true)}><Play size={14} /> Play</Button>
            <Button variant="secondary" onClick={() => openFolder('root')}><FolderOpen size={14} /> Folder</Button>
            <Button variant="secondary" onClick={() => openFolder('logs')}><FileText size={14} /> Logs</Button>
            <Button variant="ghost" onClick={remove}><Trash2 size={14} /></Button>
          </div>
        </div>
        {error && <div className="rounded border border-border-strong bg-bg-raised px-3 py-2 text-xs text-fg-muted">{error}</div>}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(['overview', 'mods', 'settings', 'logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${tab === t ? 'border-fg text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}>
            {t}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardBody className="space-y-3 py-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">metadata</div>
                <Row label="minecraft" value={instance.minecraftVersion} />
                <Row label="loader" value={`${instance.loader}${instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}`} />
                <Row label="ram" value={`${instance.ramMinMb} – ${instance.ramMaxMb} MB`} />
                <Row label="created" value={relative(instance.createdAt)} />
                <Row label="directory" value={instance.directory} mono small />
              </CardBody>
            </Card>
            <Card>
              <CardBody className="space-y-3 py-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">quick actions</div>
                <Button variant="secondary" className="w-full justify-start" onClick={() => openFolder('mods')}><FolderOpen size={14} /> Open mods folder</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => openFolder('config')}><Settings2 size={14} /> Open config folder</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={() => openFolder('saves')}><FolderOpen size={14} /> Open saves</Button>
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'mods' && <ModsTab instance={instance} onChange={refresh} />}
        {tab === 'settings' && <SettingsTab instance={instance} onChange={refresh} />}
        {tab === 'logs' && <LogsTab instanceId={instance.id} />}
      </motion.div>

      <AnimatePresence>
        {showLaunch && <LaunchModal instance={instance} onClose={() => setShowLaunch(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

function Row({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">{label}</div>
      <div className={`min-w-0 truncate text-right ${mono ? 'font-mono' : ''} ${small ? 'text-[11px]' : 'text-sm'}`} title={value}>{value}</div>
    </div>
  )
}