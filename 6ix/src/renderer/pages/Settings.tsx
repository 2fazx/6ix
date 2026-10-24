import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import type { AppSettings } from '@shared/types'

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.settings.get().then(setSettings)
  }, [])

  const save = async () => {
    if (!settings) return
    await api.settings.set(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return <div className="py-20 text-center text-xs text-fg-dim">Loading settings...</div>

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">launcher</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardBody className="space-y-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Default Min RAM (MB)">
              <Input type="number" value={settings.defaultRamMinMb} onChange={e => setSettings({ ...settings, defaultRamMinMb: parseInt(e.target.value) || 1024 })} />
            </Field>
            <Field label="Default Max RAM (MB)">
              <Input type="number" value={settings.defaultRamMaxMb} onChange={e => setSettings({ ...settings, defaultRamMaxMb: parseInt(e.target.value) || 4096 })} />
            </Field>
            <Field label="Download Concurrency">
              <Input type="number" value={settings.downloadConcurrency} onChange={e => setSettings({ ...settings, downloadConcurrency: parseInt(e.target.value) || 4 })} />
            </Field>
            <Field label="Global Java Path">
              <Input value={settings.javaPath ?? ''} placeholder="Auto-detect" onChange={e => setSettings({ ...settings, javaPath: e.target.value || null })} />
            </Field>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved ? <Badge>Saved</Badge> : <span />}
            <Button variant="primary" onClick={save}>Save changes</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">{label}</div>
      {children}
    </div>
  )
}