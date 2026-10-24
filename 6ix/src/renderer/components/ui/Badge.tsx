import type { HTMLAttributes } from 'react'

export function Badge({ className = '', ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted ${className}`}
      {...rest}
    />
  )
}