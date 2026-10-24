export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-fg-dim">
        in progress
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        This section ships in a later build phase. The shell, IPC, and data layer are live and ready
        for it.
      </p>
    </div>
  )
}