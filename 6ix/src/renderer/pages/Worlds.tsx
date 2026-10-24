import { useEffect, useState } from 'react'
import { Globe, Play } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export default function Worlds() {
  const [instances, setInstances] = useState<any[]>([])

  useEffect(() => {
    api.instances.list().then(setInstances)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">library</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Worlds</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {instances.map(inst => (
          <Card key={inst.id}>
            <CardBody className="flex flex-col gap-4 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-bg-raised"><Globe size={16} /></div>
                <div>
                  <div className="text-sm font-medium">{inst.name} Worlds</div>
                  <div className="text-xs text-fg-muted">{inst.minecraftVersion}</div>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => api.files.openFolder(inst.id, 'saves')}>
                Open Saves Folder
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}