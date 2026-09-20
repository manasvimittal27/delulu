import { useEffect, useState } from 'react'
import { ArrowUpRight, MessageCircle, UsersRound } from 'lucide-react'
import { Link } from 'wouter'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { AvatarIcon } from '@/components/AvatarIcon'

interface UpcomingPlan { groupId: string; tableName: string | null; meetAt: string; venueArea?: string }
interface CircleEntry { chatRoomId: string; user: { id: string; username: string; avatarId: string; avatarColor: string; firstName?: string } | null }

export default function Chats() {
  const [tables, setTables] = useState<UpcomingPlan[] | null>(null)
  const [circle, setCircle] = useState<CircleEntry[] | null>(null)
  useEffect(() => {
    api.get<{ plans: UpcomingPlan[] }>('/plans/upcoming').then((r) => setTables(r.plans)).catch(() => setTables([]))
    api.get<{ circle: CircleEntry[] }>('/circle').then((r) => setCircle(r.circle)).catch(() => setCircle([]))
  }, [])
  const loading = tables === null || circle === null
  const empty = !loading && tables!.length === 0 && circle!.length === 0

  return (
    <div className="app-shell pb-32">
      <div className="page-wrap">
        <header className="page-header"><div><p className="page-kicker">Keep the thread going</p><h1 className="font-display text-4xl font-semibold">Chats</h1><p>Your tables and your Delulu Circle.</p></div><div className="rounded-full bg-lime/30 text-ink px-3 py-2 text-xs font-bold flex items-center gap-2"><MessageCircle size={14} /> No awkward intros required</div></header>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr] pb-10">
          <section className="surface-card p-5 md:p-7"><div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-lilac/20 p-2.5 text-lilac"><MessageCircle size={18} /></div><div><p className="page-kicker">Your tables</p><h2 className="font-display text-2xl font-semibold mt-1">Group chats</h2></div></div>
            {loading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-2 animate-pulse" />)}</div>}
            {!loading && tables!.length === 0 && <div className="rounded-2xl bg-surface-2 p-7 text-center"><p className="font-semibold text-sm">No conversations yet.</p><p className="text-sm text-muted mt-1">Book a table to start one.</p><Link href="/plans" className="primary-button mt-5 min-h-10">See plans <ArrowUpRight size={15} /></Link></div>}
            {!loading && tables!.length > 0 && <div className="space-y-3">{tables!.map((t) => <Link key={t.groupId} href={`/chat/${t.groupId}`} className="subtle-card group flex items-center justify-between gap-4 p-4 no-underline"><div><p className="font-semibold text-sm">{t.tableName ?? 'Your table'}</p><p className="text-xs text-muted mt-1">{new Date(t.meetAt).toLocaleString()} · {t.venueArea}</p></div><ArrowUpRight size={17} className="text-muted group-hover:text-fg" /></Link>)}</div>}
          </section>
          <section className="subtle-card p-5 md:p-7"><div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-punch/15 p-2.5 text-punch"><UsersRound size={18} /></div><div><p className="page-kicker">After the meetup</p><h2 className="font-display text-2xl font-semibold mt-1">Delulu Circle</h2></div></div>
            {empty && <p className="text-sm text-muted leading-relaxed">People you mutually add after meeting land here. Your next friendship could be one conversation away.</p>}
            {!loading && circle!.length === 0 && !empty && <p className="text-sm text-muted">Your circle is waiting for its first addition.</p>}
            {!loading && circle!.length > 0 && <div className="space-y-2">{circle!.map((c) => <div key={c.chatRoomId} className="flex items-center gap-3 rounded-2xl bg-surface border border-border p-3">{c.user && <AvatarIcon avatarId={c.user.avatarId} color={c.user.avatarColor} size={38} />}<span className="text-sm font-semibold">{c.user?.firstName ?? c.user?.username}</span></div>)}</div>}
          </section>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
