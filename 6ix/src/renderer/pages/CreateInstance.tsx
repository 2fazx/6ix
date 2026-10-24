import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import type { Account, Loader, MinecraftVersionSummary, Profile } from '@shared/types'

const LOADERS: Loader[] = ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt']

export default function CreateInstance() {
  const nav = useNavigate()
  const [versions, setVersions] = useState<MinecraftVersionSummary[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState({
    name: '',
    minecraftVersion: '',
    loader: 'fabric' as Loader,
    profileId: '',
    accountId: '',
    ramMaxMb: 4096
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.mc.versions(), api.profiles.list(), api.accounts.list()]).then(
      ([v, p, a]) => {
        const releases = v.filter(x => x.type === 'release').slice(0, 40)
        setVersions(releases)
        setProfiles(p)
        setAccounts(a)
        setForm(f => ({
          ...f,
          minecraftVersion: f.minecraftVersion || releases[0]?.id || '',
          profileId: f.profileId || p[0]?.id || '',
          accountId: f.accountId || a[0]?.id || ''
        }))
      }
    )
  }, [])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.instances.create({
        name: form.name || `${form.loader}-${form.minecraftVersion}`,
        minecraftVersion: form.minecraftVersion,
        loader: form.loader,
        profileId: form.profileId || null,
        accountId: form.accountId || null,
        ramMaxMb: form.ramMaxMb
      })
      nav('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(false)
    }
  }

  const selectedProfile = profiles.find(p => p.id === form.profileId)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">
          new instance
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create instance</h1>
      </div>

      <Card>
        <CardBody className="space-y-4 py-5">
          <Field label="Name">
            <Input
              value={form.name}
              placeholder={`${form.loader}-${form.minecraftVersion}`}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <Field label="Minecraft version">
            <select
              value={form.minecraftVersion}
              onChange={e => setForm(f => ({ ...f, minecraftVersion: e.target.value }))}
              className="h-9 w-full rounded border border-border bg-bg-raised px-3 text-sm text-fg focus:border-border-strong focus:outline-none"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Loader">
            <div className="flex flex-wrap gap-1.5">
              {LOADERS.map(l => (
                <button
                  key={l}
                  onClick={() => setForm(f => ({ ...f, loader: l }))}
                  className={`rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                    form.loader === l
                      ? 'border-fg bg-fg text-bg-base'
                      : 'border-border text-fg-muted hover:border-border-strong hover:text-fg'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Account">
            {accounts.length === 0 ? (
              <div className="rounded border border-dashed border-border px-3 py-3 text-xs text-fg-dim">
                No accounts yet. Add one from the sidebar before creating this instance.
              </div>
            ) : (
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                className="h-9 w-full rounded border border-border bg-bg-raised px-3 text-sm text-fg focus:border-border-strong focus:outline-none"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.username} ({a.type})
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="Shared profile"
            hint="Keybinds, mod configs, and resource packs carry over to any instance using this profile."
          >
            <select
              value={form.profileId}
              onChange={e => setForm(f => ({ ...f, profileId: e.target.value }))}
              className="h-9 w-full rounded border border-border bg-bg-raised px-3 text-sm text-fg focus:border-border-strong focus:outline-none"
            >
              <option value="">None (isolated)</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedProfile && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedProfile.shareConfig && <Badge>config</Badge>}
                {selectedProfile.shareOptions && <Badge>keybinds</Badge>}
                {selectedProfile.shareResourcepacks && <Badge>resourcepacks</Badge>}
                {selectedProfile.shareShaderpacks && <Badge>shaderpacks</Badge>}
              </div>
            )}
          </Field>

          <Field label="Max RAM (MB)">
            <Input
              type="number"
              value={form.ramMaxMb}
              onChange={e =>
                setForm(f => ({ ...f, ramMaxMb: parseInt(e.target.value) || 4096 }))
              }
            />
          </Field>

          {error && <div className="text-xs text-fg-muted">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={busy || !form.minecraftVersion || accounts.length === 0}
            >
              {busy ? 'Creating…' : 'Create instance'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
        {label}
      </div>
      {children}
      {hint && <div className="mt-1 text-[11px] leading-relaxed text-fg-dim">{hint}</div>}
    </div>
  )
}