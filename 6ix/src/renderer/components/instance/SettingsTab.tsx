import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import type { Account, Instance, Profile } from '@shared/types'

export default function SettingsTab({
  instance,
  onChange
}: {
  instance: Instance
  onChange: () => void
}) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [form, setForm] = useState({
    name: instance.name,
    ramMinMb: instance.ramMinMb,
    ramMaxMb: instance.ramMaxMb,
    javaPath: instance.javaPath ?? '',
    jvmArgs: instance.jvmArgs ?? '',
    gameArgs: instance.gameArgs ?? '',
    accountId: instance.accountId ?? '',
    profileId: instance.profileId ?? ''
  })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.accounts.list(), api.profiles.list()]).then(([a, p]) => {
      setAccounts(a)
      setProfiles(p)
    })
  }, [])

  const save = async () => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await api.instances.update(instance.id, {
        name: form.name.trim() || instance.name,
        ramMinMb: form.ramMinMb,
        ramMaxMb: form.ramMaxMb,
        javaPath: form.javaPath || null,
        jvmArgs: form.jvmArgs || null,
        gameArgs: form.gameArgs || null,
        accountId: form.accountId || null,
        profileId: form.profileId || null
      })
      setStatus('saved')
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardBody className="space-y-5 py-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Field>

          <Field label="Account">
            <select
              value={form.accountId}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
              className="h-9 w-full rounded border border-border bg-bg-raised px-3 text-sm text-fg focus:border-border-strong focus:outline-none"
            >
              <option value="">None</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.username} ({a.type})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Shared profile" hint="Changes will re-link settings on save.">
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
          </Field>

          <Field label="Java path" hint="Leave empty to use `java` from PATH.">
            <Input
              value={form.javaPath}
              onChange={e => setForm(f => ({ ...f, javaPath: e.target.value }))}
              placeholder="/usr/bin/java or C:\Program Files\Java\…"
            />
          </Field>

          <Field label="Min RAM (MB)">
            <Input
              type="number"
              value={form.ramMinMb}
              onChange={e => setForm(f => ({ ...f, ramMinMb: parseInt(e.target.value) || 0 }))}
            />
          </Field>

          <Field label="Max RAM (MB)">
            <Input
              type="number"
              value={form.ramMaxMb}
              onChange={e => setForm(f => ({ ...f, ramMaxMb: parseInt(e.target.value) || 0 }))}
            />
          </Field>
        </div>

        <Field label="JVM args" hint="Appended after the defaults. Space-separated.">
          <Input
            value={form.jvmArgs}
            onChange={e => setForm(f => ({ ...f, jvmArgs: e.target.value }))}
            placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=200"
            className="font-mono text-xs"
          />
        </Field>

        <Field label="Game args" hint="Appended to the game arguments.">
          <Input
            value={form.gameArgs}
            onChange={e => setForm(f => ({ ...f, gameArgs: e.target.value }))}
            placeholder="--fullscreen"
            className="font-mono text-xs"
          />
        </Field>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {status && <Badge>{status}</Badge>}
            {error && <span className="text-xs text-fg-muted">{error}</span>}
          </div>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
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