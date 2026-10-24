import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export default function Library() {
  const [instances, setInstances] = useState<any[]>([])

  useEffect(() => {
    api.instances.list().then(setInstances)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">collection</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Library</h1>
      </div>

      <div className="flex flex-col gap-4">
        {instances.map(inst => (
          <Card key={inst.id}>
            <CardBody className="flex items-center justify-between py-4">
              <div>
                <div className="text-sm font-medium">{inst.name}</div>
                <div className="mt-1 flex gap-1.5">
                  <Badge>{inst.minecraftVersion}</Badge>
                  <Badge>{inst.loader}</Badge>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => api.files.openFolder(inst.id, 'mods')}>
                <FolderOpen size={14} /> Open Mods
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}