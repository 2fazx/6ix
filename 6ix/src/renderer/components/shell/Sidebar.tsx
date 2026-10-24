import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Compass, Box, Layers, Image, Sparkles, Globe, Server, Camera, Library, Download, Boxes, Plus, Hexagon, Settings, PanelLeftClose, PanelLeft, Layers3, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import AddAccountModal from './AddAccountModal'
import type { Account } from '@shared/types'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

const primary = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/mods', label: 'Mods', icon: Box },
  { to: '/modpacks', label: 'Modpacks', icon: Layers },
  { to: '/resource-packs', label: 'Resource Packs', icon: Image },
  { to: '/shaders', label: 'Shader Packs', icon: Sparkles },
  { to: '/worlds', label: 'Worlds', icon: Globe },
  { to: '/servers', label: 'Servers', icon: Server },
  { to: '/screenshots', label: 'Screenshots', icon: Camera },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/downloads', label: 'Downloads', icon: Download }
]

const secondary = [
  { to: '/instances', label: 'Instances', icon: Boxes },
  { to: '/instances/create', label: 'Create Instance', icon: Plus },
  { to: '/fabric', label: 'Fabric', icon: Hexagon }
]

export default function Sidebar({ collapsed, onToggle }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)

  const refreshAccounts = () => {
    if (!api?.accounts) return
    api.accounts.list().then(list => {
      setAccounts(list)
      if (!currentId && list[0]) setCurrentId(list[0].id)
      if (currentId && !list.find(a => a.id === currentId)) setCurrentId(list[0]?.id ?? null)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }

  useEffect(() => { refreshAccounts() }, [])

  const current = accounts.find(a => a.id === currentId) ?? null

  const deleteCurrent = async () => {
    if (!current) return
    if (!confirm(`Delete account ${current.username}?`)) return
    await api.accounts.delete(current.id)
    refreshAccounts()
  }

  return (
    <aside className={`relative z-20 flex shrink-0 flex-col border-r border-border/50 bg-bg-panel/40 backdrop-blur-xl transition-[width] duration-200 ease-6ix ${collapsed ? 'w-[56px]' : 'w-[240px]'}`}>
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed && (
          <div className="flex items-baseline gap-2 pl-2">
            <span className="text-lg font-semibold tracking-tight">6IX</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">v0.1</span>
          </div>
        )}
        <button onClick={onToggle} className="rounded p-2 text-fg-muted hover:bg-bg-hover hover:text-fg">
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        {primary.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `group flex h-9 items-center gap-3 rounded px-3 text-sm transition-colors ${isActive ? 'bg-bg-raised/80 text-fg' : 'text-fg-muted hover:bg-bg-hover/50 hover:text-fg'}`} title={collapsed ? label : undefined}>
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
        <div className="my-3 h-px bg-border/50" />
        {secondary.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `group flex h-9 items-center gap-3 rounded px-3 text-sm transition-colors ${isActive ? 'bg-bg-raised/80 text-fg' : 'text-fg-muted hover:bg-bg-hover/50 hover:text-fg'}`} title={collapsed ? label : undefined}>
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
        <NavLink to="/settings/profiles" className={({ isActive }) => `group flex h-9 items-center gap-3 rounded px-3 text-sm transition-colors ${isActive ? 'bg-bg-raised/80 text-fg' : 'text-fg-muted hover:bg-bg-hover/50 hover:text-fg'}`} title={collapsed ? 'Profiles' : undefined}>
          <Layers3 size={16} className="shrink-0" />
          {!collapsed && <span className="truncate">Profiles</span>}
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `group flex h-9 items-center gap-3 rounded px-3 text-sm transition-colors ${isActive ? 'bg-bg-raised/80 text-fg' : 'text-fg-muted hover:bg-bg-hover/50 hover:text-fg'}`} title={collapsed ? 'Settings' : undefined}>
          <Settings size={16} className="shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </NavLink>
      </nav>

      <div className="relative border-t border-border/50 p-3">
        {showAccounts && (
          <div className="absolute bottom-[60px] left-2 w-[220px] overflow-hidden rounded-lg border border-border-strong bg-bg-panel shadow-2xl">
            <div className="max-h-60 overflow-y-auto py-1">
              {accounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setCurrentId(a.id); setShowAccounts(false) }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-bg-hover ${a.id === currentId ? 'bg-bg-raised' : ''}`}
                >
                  <img src={`https://crafatar.com/avatars/${a.uuid}?overlay`} alt="" className="h-6 w-6 rounded bg-bg-raised" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{a.username}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">{a.type}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-border p-1">
              <button onClick={() => { setShowAccounts(false); setShowAdd(true) }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-fg-muted hover:bg-bg-hover hover:text-fg">
                <Plus size={14} /> Add Account
              </button>
              {current && (
                <button onClick={() => { setShowAccounts(false); deleteCurrent() }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                  <Trash2 size={14} /> Remove Current
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => setShowAccounts(!showAccounts)} className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-bg-raised hover:border-border-strong">
            {current?.uuid ? (
              <img src={`https://crafatar.com/avatars/${current.uuid}?overlay`} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-mono text-[10px] uppercase text-fg-muted">{current ? current.username.slice(0, 2) : '—'}</span>
            )}
          </button>
          {!collapsed && (
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setShowAccounts(!showAccounts)}>
              <div className="truncate text-xs font-medium">{loaded && !current ? 'No account' : current?.username ?? ''}</div>
              <div className="truncate font-mono text-[10px] uppercase tracking-wider text-fg-dim">{current ? current.type : 'add one'}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}