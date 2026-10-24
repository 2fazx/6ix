import { useEffect, useRef, useState } from 'react'
import { X, Terminal, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import type { Instance, InstallProgress, LaunchLog } from '@shared/types'

export default function LaunchModal({
  instance,
  onClose
}: {
  instance: Instance
  onClose: () => void
}) {
  const [logs, setLogs] = useState<string>('')
  const [installing, setInstalling] = useState<InstallProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    const offLog = api.launch.onLog((log: LaunchLog) => {
      setLogs(prev => prev + log.text)
      if (logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    })
    const offExit = api.launch.onExit(() => {
      setRunning(false)
      setLogs(prev => prev + '\n[6IX] Game process exited.\n')
    })

    const start = async () => {
      // Prevent React Strict Mode double-launch
      if (hasStarted.current) return
      hasStarted.current = true

      try {
        setRunning(true)
        await api.launch.start(instance.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'failed to launch')
        setRunning(false)
      }
    }
    start()

    return () => {
      offLog()
      offExit()
    }
  }, [instance.id])

  const kill = async () => {
    await api.launch.kill(instance.id)
    setRunning(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
      <div className="flex h-[600px] w-[800px] flex-col overflow-hidden rounded-lg border border-border-strong bg-bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            {running ? (
              <Loader2 size={16} className="animate-spin text-fg" />
            ) : (
              <Terminal size={16} className="text-fg-dim" />
            )}
            <div>
              <div className="text-sm font-medium">{instance.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                {running ? 'Running' : 'Finished'}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={running}>
            <X size={16} />
          </Button>
        </div>

        {installing && installing.stage !== 'done' && (
          <div className="border-b border-border bg-bg-raised px-5 py-3">
            <div className="mb-1 flex justify-between text-xs text-fg-muted">
              <span>{installing.message}</span>
              <span>
                {installing.total > 0
                  ? `${Math.round((installing.current / installing.total) * 100)}%`
                  : ''}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded bg-border">
              <div
                className="h-full bg-fg transition-all"
                style={{
                  width: `${installing.total > 0 ? (installing.current / installing.total) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-[#050505] p-4 font-mono text-[11px] leading-relaxed text-[#a1a1aa]">
          <pre className="whitespace-pre-wrap break-words">{logs || 'Starting process...\n'}</pre>
          {error && <div className="mt-4 text-red-400">{error}</div>}
          <div ref={logEndRef} />
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            PID: {running ? 'Active' : 'None'}
          </div>
          <div className="flex gap-2">
            {running && (
              <Button variant="danger" size="sm" onClick={kill}>
                Kill Process
              </Button>
            )}
            {!running && (
              <Button variant="primary" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}