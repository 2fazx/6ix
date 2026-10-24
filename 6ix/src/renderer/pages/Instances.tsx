import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../lib/api'
import { relative } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import type { Instance } from '@shared/types'

export default function Instances() {
  const [instances, setInstances] = useState<Instance[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.instances.list().then(setInstances).catch(e => setError(e instanceof Error ? e.message : 'failed'))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">library</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Instances</h1>
        </div>
        <Link to="/instances/create">
          <Button variant="primary" size="sm"><Plus size={14} /> Create instance</Button>
        </Link>
      </div>

      {error && <div className="rounded border border-border-strong bg-bg-panel p-4 text-sm text-fg-muted">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {instances === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardBody className="space-y-3 py-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /><Skeleton className="h-9 w-full" /></CardBody></Card>
            ))
          : instances.map(inst => (
              <Link key={inst.id} to={`/instances/${inst.id}`}>
                <Card className="group overflow-hidden transition-colors hover:border-border-strong">
                  {inst.iconPath && (
                    <div className="relative h-32 w-full overflow-hidden">
                      <img src={`6ix-media://${inst.iconPath}`} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-panel to-transparent" />
                    </div>
                  )}
                  <CardBody className="flex flex-col gap-4 py-5 relative">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{inst.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge>{inst.minecraftVersion}</Badge>
                          <Badge>{inst.loader}</Badge>
                          {inst.profileId && <Badge>shared</Badge>}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">{relative(inst.lastPlayedAt)}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-fg-muted">
                      <span>{inst.ramMaxMb}M</span>
                      <span>·</span>
                      <span>{inst.accountId ? 'account linked' : 'no account'}</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
        {instances && instances.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardBody className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="text-sm text-fg">No instances yet.</div>
              <Link to="/instances/create"><Button variant="primary" size="sm" className="mt-2">Create instance</Button></Link>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}