import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, ChevronRight, Cpu, Box, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { relative, compact } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import LaunchModal from '../components/instance/LaunchModal'
import type { Account, Instance, ModrinthProject } from '@shared/types'

export default function Home() {
  const [instances, setInstances] = useState<Instance[] | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [mods, setMods] = useState<ModrinthProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [launchInstance, setLaunchInstance] = useState<Instance | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [inst, acc, search] = await Promise.all([
          api.instances.list(),
          api.accounts.list(),
          api.modrinth.search({ projectType: 'mod', sort: 'downloads', limit: 6 })
        ])
        if (!cancelled) {
          setInstances(inst)
          setAccounts(acc)
          setMods(search.hits)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'failed')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const selected = instances?.[0]
  const currentAccount = selected?.accountId 
    ? accounts.find(a => a.id === selected.accountId) || accounts[0]
    : accounts[0]

  return (
    <div className="flex flex-col gap-10">
      <section className="relative flex h-[500px] flex-col items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-bg-panel to-bg-panel" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center">
          {currentAccount ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center">
              <div className="mb-4 rounded-md border border-white/10 bg-black/60 px-4 py-1.5 backdrop-blur-md">
                <span className="text-sm font-semibold tracking-wide text-white">{currentAccount.username}</span>
              </div>
              <img 
                src={`https://mc-heads.net/body/${currentAccount.uuid}/right`} 
                alt={currentAccount.username} 
                className="h-64 w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                style={{ imageRendering: 'pixelated' }}
              />
            </motion.div>
          ) : (
             <div className="flex h-64 items-center justify-center text-sm text-fg-muted">
               No account selected
             </div>
          )}
        </div>

        {selected && (
          <div className="absolute inset-y-0 left-12 hidden flex-col justify-center gap-4 lg:flex">
            <StatGlass icon={<Cpu size={16} />} label="RAM" value={`${selected.ramMaxMb}M`} delay={0.1} />
            <StatGlass icon={<Layers size={16} />} label="Loader" value={selected.loader} delay={0.2} />
          </div>
        )}
        
        {instances && (
          <div className="absolute inset-y-0 right-12 hidden flex-col justify-center gap-4 lg:flex">
            <StatGlass icon={<Box size={16} />} label="Instances" value={String(instances.length)} delay={0.1} />
            <StatGlass icon={<Play size={16} />} label="Version" value={selected?.minecraftVersion || '—'} delay={0.2} />
          </div>
        )}

        <div className="relative z-10 mt-8">
          {selected ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              onClick={() => setLaunchInstance(selected)}
              className="group relative flex h-16 w-80 items-center justify-between overflow-hidden rounded-xl bg-gradient-to-r from-white via-zinc-200 to-white px-6 shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-lg font-black tracking-tight text-black">LAUNCH GAME</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-black/60">
                  {selected.name} · {selected.loader}
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-colors group-hover:bg-black/20">
                <Play size={16} className="text-black fill-black translate-x-0.5" />
              </div>
            </motion.button>
          ) : (
            <Link to="/instances/create">
              <Button variant="primary" size="lg">Create Instance</Button>
            </Link>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">continue</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Your instances</h2>
          </div>
          <Link to="/instances">
            <Button variant="ghost" size="sm">View all <ChevronRight size={14} /></Button>
          </Link>
        </div>

        {error && <div className="rounded border border-border-strong bg-bg-panel p-4 text-sm text-fg-muted">Couldn't load your library: {error}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances === null
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardBody className="space-y-3 py-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /><Skeleton className="h-9 w-full" /></CardBody></Card>
              ))
            : instances.slice(0, 3).map(inst => (
                <Card key={inst.id} className="group overflow-hidden transition-colors hover:border-border-strong bg-black/20 backdrop-blur-sm">
                  {inst.iconPath && (
                    <div className="relative h-24 w-full overflow-hidden">
                      <img src={`6ix-media://${inst.iconPath}`} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-panel to-transparent" />
                    </div>
                  )}
                  <CardBody className="flex flex-col gap-4 py-5 relative">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <Link to={`/instances/${inst.id}`} className="truncate text-sm font-medium hover:underline">{inst.name}</Link>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge>{inst.minecraftVersion}</Badge>
                          <Badge>{inst.loader}</Badge>
                          {inst.profileId && <Badge>shared</Badge>}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">{relative(inst.lastPlayedAt)}</span>
                    </div>
                    <Button variant="primary" size="sm" className="w-full" onClick={() => setLaunchInstance(inst)}>
                      <Play size={14} /> Play
                    </Button>
                  </CardBody>
                </Card>
              ))}
          {instances && instances.length === 0 && (
            <Card className="md:col-span-2 lg:col-span-3 bg-black/20 backdrop-blur-sm">
              <CardBody className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="text-sm text-fg">No instances yet.</div>
                <Link to="/instances/create">
                  <Button variant="primary" size="sm" className="mt-2">Create instance</Button>
                </Link>
              </CardBody>
            </Card>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-dim">discover</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Popular mods</h2>
          </div>
          <Link to="/mods">
            <Button variant="ghost" size="sm">Browse <ChevronRight size={14} /></Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mods === null
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardBody className="space-y-3 py-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-24" /></CardBody></Card>
              ))
            : mods.map((m, i) => (
                <Card key={m.slug || m.id || `mod-${i}`} className="transition-colors hover:border-border-strong bg-black/20 backdrop-blur-sm">
                  <CardBody className="flex gap-3 py-4">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-bg-raised">
                      {m.icon_url ? <img src={m.icon_url} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{m.title}</div>
                      <div className="line-clamp-2 mt-0.5 text-xs leading-relaxed text-fg-muted">{m.description}</div>
                      <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                        <span>{compact(m.downloads)} dl</span>
                        <span>·</span>
                        <span className="truncate">{m.author}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
        </div>
      </section>

      {launchInstance && <LaunchModal instance={launchInstance} onClose={() => setLaunchInstance(null)} />}
    </div>
  )
}

function StatGlass({ icon, label, value, delay }: { icon: React.ReactNode, label: string, value: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ delay, duration: 0.4 }}
      className="flex w-40 items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md shadow-lg"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-medium uppercase tracking-widest text-white/50">{label}</div>
        <div className="text-sm font-semibold text-white">{value}</div>
      </div>
    </motion.div>
  )
}