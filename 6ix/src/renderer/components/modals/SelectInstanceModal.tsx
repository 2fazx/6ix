import { useEffect, useState } from 'react'
import { Server, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { Instance } from '@shared/types'

export default function SelectInstanceModal({
  onSelect,
  onClose
}: {
  onSelect: (instance: Instance) => void
  onClose: () => void
}) {
  const [instances, setInstances] = useState<Instance[] | null>(null)

  useEffect(() => {
    api.instances.list().then(setInstances)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-[480px] overflow-hidden rounded-lg border border-border-strong bg-bg-panel shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">
            select target
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Install to instance</h2>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {instances === null ? (
            <div className="py-12 text-center text-xs text-fg-dim">
              <Loader2 size={16} className="mx-auto mb-2 animate-spin" />
              loading instances…
            </div>
          ) : instances.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">
              You have no instances. Create one first.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {instances.map(inst => (
                <li key={inst.id}>
                  <button
                    onClick={() => onSelect(inst)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-bg-hover"
                  >
                    <div>
                      <div className="text-sm font-medium">{inst.name}</div>
                      <div className="mt-1 flex gap-1.5">
                        <Badge>{inst.minecraftVersion}</Badge>
                        <Badge>{inst.loader}</Badge>
                      </div>
                    </div>
                    <Server size={16} className="text-fg-dim" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}