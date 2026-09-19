import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, MapPin, PartyPopper } from 'lucide-react'
import { Link } from 'wouter'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'

interface EventItem {
  id: string
  title: string
  category: string
  date: string
  time: string
  area: string
  pricePaise: number
  capacity: number
  vibeTags: string[]
  isDeluluHosted: boolean
  venueName?: string
  coverImageUrl?: string | null
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[] | null>(null)

  useEffect(() => {
    api.get<{ events: EventItem[] }>('/events').then((r) => setEvents(r.events)).catch(() => setEvents([]))
  }, [])

  return (
    <div className="app-shell pb-32">
      <div className="page-wrap">
        <header className="page-header">
          <div><p className="page-kicker">Do something different</p><h1 className="font-display text-4xl font-semibold">Events</h1><p>Curated experiences with 6–10 strangers.</p></div>
          <div className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold flex items-center gap-2"><PartyPopper size={14} className="text-tangerine" /> Your city, your energy</div>
        </header>
        <div className="grid gap-5 pb-10 sm:grid-cols-2 lg:grid-cols-3">
          {events === null && [0, 1, 2].map((i) => <div key={i} className="h-80 rounded-[24px] bg-surface-2 animate-pulse" />)}
          {events?.length === 0 && <div className="surface-card p-10 text-center sm:col-span-2 lg:col-span-3"><PartyPopper size={24} className="mx-auto text-tangerine mb-3" /><p className="font-semibold">Nothing chaotic here yet.</p><p className="text-sm text-muted mt-1">Check another date or join the waitlist.</p></div>}
          {events?.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="surface-card group overflow-hidden no-underline transition-transform hover:-translate-y-1">
              {e.coverImageUrl ? <img src={e.coverImageUrl} alt="" className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="h-52 w-full bg-[radial-gradient(circle_at_25%_25%,var(--delulu-lilac),transparent_44%),linear-gradient(135deg,var(--delulu-punch),var(--delulu-tangerine))]" />}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.14em] text-muted font-bold">{e.category}</p><p className="font-display text-xl font-semibold mt-2 tracking-tight">{e.title}</p></div><ArrowUpRight size={17} className="text-muted" /></div>
                <div className="mt-4 space-y-2 text-xs text-muted"><p className="flex items-center gap-2"><CalendarDays size={13} /> {e.date} · {e.time}</p><p className="flex items-center gap-2"><MapPin size={13} /> {e.area}</p></div>
                <div className="flex items-center justify-between gap-3 mt-5"><div className="flex gap-1.5 flex-wrap">{(e.vibeTags ?? []).slice(0, 3).map((t) => <span key={t} className="rounded-full bg-surface-2 border border-border px-2.5 py-1 text-[10px] text-muted">{t}</span>)}</div><span className="text-sm font-bold text-tangerine">₹{(e.pricePaise / 100).toFixed(0)}</span></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
