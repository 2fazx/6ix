import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import type { Account } from '@shared/types'

type Tab = 'skins' | 'capes'

export default function Skins() {
  const nav = useNavigate()
  const [activeAccount, setActiveAccount] = useState<Account | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('skins')
  const [error, setError] = useState<string | null>(null)
  const hasLoaded = useRef(false)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const accounts = await api.accounts.list()
      const msAccount = accounts.find(a => a.type === 'microsoft')
      if (!msAccount) {
        setError('No Microsoft account found. Sign in first.')
        return
      }
      setActiveAccount(msAccount)
      const prof = await api.skins.getProfile(msAccount.id)
      setProfile(prof)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Prevent React Strict Mode double-fetch
    if (hasLoaded.current) return
    hasLoaded.current = true
    load()
  }, [])

  const handleUpload = async () => {
    if (!activeAccount) return
    try {
      setError(null)
      const success = await api.skins.upload(activeAccount.id)
      if (success) await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed')
    }
  }

  const handleCape = async (capeId: string | null) => {
    if (!activeAccount) return
    try {
      setError(null)
      await api.skins.equipCape(activeAccount.id, capeId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'cape equip failed')
    }
  }

  if (loading) return <div className="py-20 text-center text-sm text-fg-muted">Loading profile...</div>
  if (error) return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-20 text-center">
      <div className="text-sm text-red-400">{error}</div>
      <Button variant="secondary" onClick={load}>Try Again</Button>
      <button onClick={() => nav('/')} className="text-xs text-fg-muted hover:text-fg">back to home</button>
    </div>
  )
  if (!profile) return null

  const activeCape = profile.capes?.find((c: any) => c.state === 'ACTIVE')

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-4xl flex-col gap-6">
      <button onClick={() => nav('/')} className="inline-flex items-center gap-2 text-xs text-fg-muted hover:text-fg w-fit">
        <ArrowLeft size={14} /> back to home
      </button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_300px]">
        
        {/* Left: Preview */}
        <div className="relative flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/40 p-8 shadow-2xl overflow-hidden min-h-[400px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-4 rounded-md border border-white/10 bg-black/60 px-4 py-1.5 backdrop-blur-md">
              <span className="text-sm font-semibold tracking-wide text-white">{profile.name}</span>
            </div>
            
            <div className="relative flex items-end justify-center h-[320px]">
              <img 
                src={`https://mc-heads.net/body/${profile.id}/left`} 
                alt={profile.name} 
                className="h-full w-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] z-10"
                style={{ imageRendering: 'pixelated' }}
              />
              {activeCape && (
                <img 
                  src={activeCape.url} 
                  alt="Cape" 
                  className="absolute right-[-40px] top-[80px] h-[150px] w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-0"
                  style={{ imageRendering: 'pixelated', transform: 'skewY(10deg)' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 rounded-lg bg-bg-raised p-1 border border-border">
            <button onClick={() => setTab('skins')} className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === 'skins' ? 'bg-bg-panel text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>Skins</button>
            <button onClick={() => setTab('capes')} className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === 'capes' ? 'bg-bg-panel text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}>Capes</button>
          </div>

          {tab === 'skins' && (
            <Card>
              <CardBody className="flex flex-col gap-4 py-5">
                <div className="text-sm font-medium">Active Skin</div>
                <div className="rounded-lg border border-border bg-bg-raised p-4 flex items-center justify-center">
                  <img src={`https://crafatar.com/renders/body/${profile.id}?overlay`} alt="Skin" className="h-32 object-contain" style={{ imageRendering: 'pixelated' }} />
                </div>
                <Button variant="primary" onClick={handleUpload}>
                  <Upload size={14} /> Upload New Skin
                </Button>
                <div className="text-center text-xs text-fg-muted">Supports 64x64 PNG files</div>
              </CardBody>
            </Card>
          )}

          {tab === 'capes' && (
            <Card>
              <CardBody className="flex flex-col gap-3 py-5">
                <div className="text-sm font-medium">Your Capes</div>
                {profile.capes?.length === 0 ? (
                  <div className="text-center py-6 text-xs text-fg-muted border border-dashed border-border rounded-lg">No capes owned on this account.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCape(null)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${!activeCape ? 'border-fg bg-bg-raised' : 'border-border hover:border-border-strong'}`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-bg-panel border border-border"><Shield size={20} className="text-fg-muted" /></div>
                      <span className="text-xs font-medium">None</span>
                    </button>
                    {profile.capes?.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => handleCape(c.id)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${c.state === 'ACTIVE' ? 'border-fg bg-bg-raised' : 'border-border hover:border-border-strong'}`}
                      >
                        <img src={c.url} alt={c.alias} className="h-12 w-12 object-contain drop-shadow-md" style={{ imageRendering: 'pixelated' }} />
                        <span className="text-xs font-medium truncate w-full text-center">{c.alias}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}