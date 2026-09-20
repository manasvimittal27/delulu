import { useEffect, useState } from 'react'
import { ArrowUpRight, LogOut, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useLocation } from 'wouter'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { BottomNav } from '@/components/BottomNav'
import { AvatarIcon } from '@/components/AvatarIcon'

const RELIABILITY_LABEL: Record<string, string> = { excellent: 'Reliability: Excellent', good: 'Reliability: Good', shaky: 'Reliability: Shaky' }

interface Vibe { archetype: string; description: string }

export default function Me() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [, navigate] = useLocation()
  const [vibe, setVibe] = useState<Vibe | null>(null)

  useEffect(() => {
    api.get<{ vibe: Vibe | null }>('/quiz/vibe').then((r) => setVibe(r.vibe)).catch(() => setVibe(null))
  }, [])

  async function logout() { await api.post('/auth/logout'); setUser(null); navigate('/') }
  if (!user) return null

  return (
    <div className="app-shell pb-32">
      <div className="page-wrap">
        <header className="page-header items-center"><div className="flex items-center gap-4"><AvatarIcon avatarId={user.avatarId ?? 'blob'} color={user.avatarColor ?? '#A78BFA'} size={76} /><div><p className="page-kicker">Your Delulu identity</p><h1 className="font-display text-3xl font-semibold mt-2">{user.username}</h1>{vibe && <p className="text-sm font-semibold text-lilac mt-1 flex items-center gap-1"><Sparkles size={13} /> {vibe.archetype}</p>}<p className="text-sm text-muted mt-1">{RELIABILITY_LABEL[user.reliability]}</p></div></div><div className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold flex items-center gap-2"><ShieldCheck size={14} className="text-lime" /> Private by design</div></header>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr] pb-10">
          <section className="surface-card p-5 md:p-7"><p className="page-kicker mb-4">Account snapshot</p><div className="grid gap-3 sm:grid-cols-2"><div className="subtle-card p-4"><p className="text-xs text-muted">Credits</p><p className="font-display text-2xl font-semibold mt-2">₹{(user.creditsPaise / 100).toFixed(2)}</p></div><div className="subtle-card p-4"><p className="text-xs text-muted">City</p><p className="font-display text-2xl font-semibold mt-2">{user.city}</p></div></div>{user.role !== 'user' && <div className="mt-3 rounded-2xl bg-lime/20 border border-lime/30 p-4 text-sm font-semibold">Role: {user.role}</div>}</section>
          <section className="subtle-card p-5 md:p-7"><p className="page-kicker mb-4">Safety and access</p><div className="space-y-2"><a href="/me/emergency-contacts" className="account-link">Emergency contacts <ArrowUpRight size={16} /></a><a href="/host" className="account-link">Host portal <ArrowUpRight size={16} /></a>{user.role === 'admin' && <a href="/admin" className="account-link">Admin dashboard <ArrowUpRight size={16} /></a>}</div></section>
        </div>
        <section className="surface-card p-5 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5"><div><p className="page-kicker">Ready to leave the group chat?</p><p className="text-sm text-muted mt-2">Your profile stays private if you log out.</p></div><button onClick={logout} className="secondary-button !text-punch !border-punch/30"><LogOut size={16} /> Log out</button></section>
        <div className="flex items-center gap-4 flex-wrap mt-8 pb-8 text-xs text-muted">{['safety', 'terms', 'privacy', 'refunds', 'hosts'].map((p) => <a key={p} href={`/legal/${p}`} className="hover:text-fg capitalize">{p}</a>)}<span className="inline-flex items-center gap-1"><UserRound size={12} /> member since today</span></div>
      </div>
      <BottomNav />
    </div>
  )
}
