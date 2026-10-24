import { useEffect, useState } from 'react'
import { Loader2, LogIn, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Account, MsAuthProgress } from '@shared/types'

type Mode = 'pick' | 'offline'

export default function AddAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: Account) => void }) {
  const [mode, setMode] = useState<Mode>('pick')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'offline' | 'ms' | null>(null)
  const [msStage, setMsStage] = useState<string | null>(null)

  useEffect(() => {
    const off = api.onMsAuthProgress((p: MsAuthProgress) => setMsStage(p.message))
    return off
  }, [])

  const submitOffline = async () => {
    setBusy('offline'); setError(null)
    try {
      const acc = await api.accounts.createOffline(username)
      onCreated(acc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null)
    }
  }

  const submitMicrosoft = async () => {
    setBusy('ms'); setError(null); setMsStage('Opening Microsoft sign-in…')
    try {
      const acc = await api.accounts.createMicrosoft()
      onCreated(acc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(null); setMsStage(null)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-[440px] rounded-lg border border-border-strong bg-bg-panel p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">add account</div>

          {mode === 'pick' && (
            <>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">Choose account type</h2>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                Microsoft unlocks online servers, Realms, skins, and capes. Offline works for singleplayer and offline-mode servers.
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <button onClick={submitMicrosoft} disabled={busy !== null} className="flex items-center gap-3 rounded border border-border bg-bg-raised p-4 text-left transition-colors hover:border-border-strong disabled:opacity-60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border-strong">
                    {busy === 'ms' ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Microsoft account</div>
                    <div className="mt-0.5 truncate text-xs text-fg-muted">{busy === 'ms' ? msStage ?? 'Starting…' : 'Sign in with an account that owns Minecraft'}</div>
                  </div>
                </button>

                <button onClick={() => setMode('offline')} disabled={busy !== null} className="flex items-center gap-3 rounded border border-border bg-bg-raised p-4 text-left transition-colors hover:border-border-strong disabled:opacity-60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border-strong">
                    <User size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Offline account</div>
                    <div className="mt-0.5 truncate text-xs text-fg-muted">Custom username, Mojang offline UUID, no login</div>
                  </div>
                </button>
              </div>

              {error && <div className="mt-4 text-xs text-fg-muted">{error}</div>}
            </>
          )}

          {mode === 'offline' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">Offline account</h2>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                Uses Mojang's offline UUID. Works for singleplayer and offline-mode servers. Online-mode servers will reject it.
              </p>
              <div className="mt-5 space-y-3">
                <Input autoFocus value={username} onChange={e => setUsername(e.target.value)} placeholder="username" maxLength={16} onKeyDown={e => e.key === 'Enter' && username.trim().length >= 3 && submitOffline()} />
                {error && <div className="text-xs text-fg-muted">{error}</div>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={() => setMode('pick')} disabled={busy !== null}>Back</Button>
                  <Button variant="primary" onClick={submitOffline} disabled={busy !== null || username.trim().length < 3}>
                    {busy === 'offline' ? 'Creating…' : 'Create'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'pick' && (
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={onClose} disabled={busy !== null}>Cancel</Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}