import { Minus, Square, X } from 'lucide-react'
import { api } from '../../lib/api'

export default function TitleBar() {
  return (
    <div 
      className="flex h-9 w-full shrink-0 items-center justify-between bg-transparent px-4 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-fg-muted">6IX</span>
      </div>

      <div 
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button 
          onClick={() => api.window.minimize()}
          className="flex h-7 w-8 items-center justify-center rounded text-fg-muted hover:bg-white/10 hover:text-white transition-colors"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={() => api.window.maximize()}
          className="flex h-7 w-8 items-center justify-center rounded text-fg-muted hover:bg-white/10 hover:text-white transition-colors"
        >
          <Square size={10} />
        </button>
        <button 
          onClick={() => api.window.close()}
          className="flex h-7 w-8 items-center justify-center rounded text-fg-muted hover:bg-red-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}