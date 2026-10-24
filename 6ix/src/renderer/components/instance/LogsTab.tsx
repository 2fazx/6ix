import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'

export default function LogsTab({ instanceId }: { instanceId: string }) {
  const [log, setLog] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    try {
      setLog(await api.files.readLog(instanceId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    }
  }

  useEffect(() => {
    refresh()
  }, [instanceId])

  return (
    <Card>
      <CardBody className="space-y-3 py-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">
            logs/latest.log
          </div>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={12} /> Refresh
          </Button>
        </div>
        {error && <div className="text-xs text-fg-muted">{error}</div>}
        <div className="h-[60vh] overflow-auto rounded border border-border bg-bg-base p-3 font-mono text-[11px] leading-relaxed text-fg-muted">
          {log === undefined ? (
            <div className="text-fg-dim">loading…</div>
          ) : log === null ? (
            <div className="text-fg-dim">
              No log file yet. Launch this instance to generate one.
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words">{log}</pre>
          )}
        </div>
      </CardBody>
    </Card>
  )
}