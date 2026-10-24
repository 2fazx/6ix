import { useEffect, useState } from 'react'
import { Plus, Trash2, Upload, Loader2, Wrench } from 'lucide-react'
import { api } from '../../lib/api'
import { bytes } from '../../lib/format'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'
import { Badge } from '../ui/Badge'
import InstallModModal from './InstallModModal'
import type { Instance, ModFile } from '@shared/types'

export default function ModsTab({
  instance,
  onChange
}: {
  instance: Instance
  onChange: () => void
}) {
  const [mods, setMods] = useState<ModFile[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [conflicts, setConflicts] = useState<string[]>([])

  const refresh = async () => {
    try {
      setMods(await api.mods.list(instance.id))
      const c = await api.mods.checkConflicts(instance.id)
      setConflicts(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    }
  }

  useEffect(() => {
    refresh()
  }, [instance.id])

  const toggle = async (m: ModFile) => {
    setBusy(m.fileName)
    setError(null)
    try {
      await api.mods.toggle(instance.id, m.fileName)
      await refresh()
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (m: ModFile) => {
    if (!confirm(`Delete ${m.displayName}?`)) return
    setBusy(m.fileName)
    setError(null)
    try {
      await api.mods.delete(instance.id, m.fileName)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  const importJar = async () => {
    setError(null)
    try {
      const result = await api.mods.import(instance.id)
      if (result) await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">mods</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            {mods === null ? '…' : `${mods.length} installed`}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => alert('Auto-fixer logic coming in the next update!')}>
            <Wrench size={14} /> Fix Issues
          </Button>
          <Button variant="secondary" size="sm" onClick={importJar}>
            <Upload size={14} /> Import jar
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowInstall(true)}>
            <Plus size={14} /> Install from Modrinth
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-border-strong bg-bg-panel px-3 py-2 text-xs text-fg-muted">
          {error}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded border border-red-500/50 bg-red-500/10 p-4">
          <div className="text-sm font-semibold text-red-500">Mod Conflicts Detected</div>
          <ul className="mt-2 list-inside list-disc text-xs text-red-400">
            {conflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      <Card>
        <CardBody className="py-0">
          {mods === null ? (
            <div className="py-10 text-center text-xs text-fg-dim">loading…</div>
          ) : mods.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <div className="text-sm text-fg">No mods installed</div>
              <div className="max-w-sm text-xs text-fg-muted">
                Install from Modrinth or drop a jar into the mods folder.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {mods.map(m => (
                <li key={m.fileName} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm">{m.displayName}</div>
                      {!m.enabled && <Badge>disabled</Badge>}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      {bytes(m.sizeBytes)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggle(m)}
                      disabled={busy === m.fileName}
                      className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                        m.enabled
                          ? 'border-border-strong text-fg-muted hover:text-fg'
                          : 'border-fg bg-fg text-bg-base'
                      }`}
                    >
                      {busy === m.fileName ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : m.enabled ? (
                        'disable'
                      ) : (
                        'enable'
                      )}
                    </button>
                    <button
                      onClick={() => remove(m)}
                      disabled={busy === m.fileName}
                      className="rounded p-1.5 text-fg-dim hover:text-fg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {showInstall && (
        <InstallModModal
          instance={instance}
          onClose={() => setShowInstall(false)}
          onInstalled={async () => {
            setShowInstall(false)
            await refresh()
          }}
        />
      )}
    </div>
  )
}