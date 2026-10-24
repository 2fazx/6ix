import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import type { Profile } from '@shared/types'

export default function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [name, setName] = useState('Default')
  const [flags, setFlags] = useState({
    shareOptions: true,
    shareConfig: true,
    shareResourcepacks: false,
    shareShaderpacks: false
  })

  const refresh = () => api.profiles.list().then(setProfiles)
  useEffect(() => {
    refresh()
  }, [])

  const create = async () => {
    if (!name.trim()) return
    await api.profiles.create({ name: name.trim(), ...flags })
    setName('Default')
    refresh()
  }

  const remove = async (id: string) => {
    if (
      !confirm(
        'Delete this profile? Instances using it will become isolated. Profile data will be removed.'
      )
    )
      return
    await api.profiles.delete(id)
    refresh()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">
          shared profiles
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Cross-loader settings</h1>
        <p className="mt-2 max-w-lg text-xs leading-relaxed text-fg-muted">
          A profile is a folder of shared game settings. Every instance pointing at the same profile
          reads keybinds, mod configs, and resource packs from that folder via symlinks. Fabric,
          Forge, NeoForge, Quilt, vanilla — they all see the same files.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4 py-5">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
                name
              </div>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <Button variant="primary" onClick={create} disabled={!name.trim()}>
              <Plus size={14} /> Create
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Toggle
              label="options.txt (keybinds, audio, video)"
              checked={flags.shareOptions}
              onChange={v => setFlags(f => ({ ...f, shareOptions: v }))}
            />
            <Toggle
              label="config (mod settings)"
              checked={flags.shareConfig}
              onChange={v => setFlags(f => ({ ...f, shareConfig: v }))}
            />
            <Toggle
              label="resourcepacks"
              checked={flags.shareResourcepacks}
              onChange={v => setFlags(f => ({ ...f, shareResourcepacks: v }))}
            />
            <Toggle
              label="shaderpacks"
              checked={flags.shareShaderpacks}
              onChange={v => setFlags(f => ({ ...f, shareShaderpacks: v }))}
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col gap-2">
        {profiles.map(p => (
          <Card key={p.id}>
            <CardBody className="flex items-center justify-between py-4">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.shareOptions && <Badge>keybinds</Badge>}
                  {p.shareConfig && <Badge>config</Badge>}
                  {p.shareResourcepacks && <Badge>resourcepacks</Badge>}
                  {p.shareShaderpacks && <Badge>shaderpacks</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                <Trash2 size={14} />
              </Button>
            </CardBody>
          </Card>
        ))}
        {profiles.length === 0 && (
          <div className="rounded border border-dashed border-border py-10 text-center text-xs text-fg-dim">
            No profiles yet.
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
        checked
          ? 'border-fg bg-fg text-bg-base'
          : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
      }`}
    >
      {label}
    </button>
  )
}