import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '../ui/Input'

interface Props {
  open: boolean
  onClose: () => void
}

const COMMANDS = [
  { id: 'home', label: 'Go to Home', path: '/' },
  { id: 'discover', label: 'Go to Discover', path: '/discover' },
  { id: 'mods', label: 'Go to Mods', path: '/mods' },
  { id: 'modpacks', label: 'Go to Modpacks', path: '/modpacks' },
  { id: 'shaders', label: 'Go to Shaders', path: '/shaders' },
  { id: 'instances', label: 'Go to Instances', path: '/instances' },
  { id: 'create', label: 'Create Instance', path: '/instances/create' },
  { id: 'profiles', label: 'Manage Profiles', path: '/settings/profiles' },
  { id: 'downloads', label: 'Go to Downloads', path: '/downloads' },
  { id: 'settings', label: 'Go to Settings', path: '/settings' }
]

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive(a => Math.min(a + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive(a => Math.max(a - 1, 0))
      }
      if (e.key === 'Enter' && filtered[active]) {
        nav(filtered[active].path)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, active, nav, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-[560px] overflow-hidden rounded-lg border border-border-strong bg-bg-panel shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={14} className="text-fg-dim" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="border-0 bg-transparent focus:border-0"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  nav(c.path)
                  onClose()
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center px-4 py-2 text-left text-sm ${
                  i === active ? 'bg-bg-hover text-fg' : 'text-fg-muted'
                }`}
              >
                {c.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-fg-dim">no matches</li>
          )}
        </ul>
      </div>
    </div>
  )
}