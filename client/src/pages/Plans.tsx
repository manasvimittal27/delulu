import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, Coffee, Sparkles } from 'lucide-react'
import { Link } from 'wouter'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { NotificationBell } from '@/components/NotificationBell'
import { CafeBookingSheet } from '@/features/matchmaking/CafeBookingSheet'

interface UpcomingPlan {
  groupId: string
  tableName: string | null
  meetAt: string
  venueName?: string
  venueArea?: string
  status: string
}

export default function Plans() {
  const [dates, setDates] = useState<{ date: string; days: Date[] }>({ date: '', days: [] })
  const [upcoming, setUpcoming] = useState<UpcomingPlan[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const days: Date[] = []
    const today = new Date()
    for (let i = 0; i < 45; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    setDates({ date: today.toISOString().slice(0, 10), days })
    api.get<{ plans: UpcomingPlan[] }>('/plans/upcoming').then((up) => setUpcoming(up.plans)).catch((e) => {
      setError(e instanceof Error ? e.message : 'Unable to load plans right now')
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="app-shell pb-32">
      <div className="page-wrap">
        <header className="page-header">
          <div>
            <p className="page-kicker">Your next plot twist</p>
            <h1 className="font-display text-4xl font-semibold">Plans</h1>
            <p>Pick a date. See who shows up.</p>
          </div>
          <NotificationBell />
        </header>

        <div className="grid gap-5 md:grid-cols-[1.1fr_.9fr] pb-10">
          <section className="surface-card p-5 md:p-7">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="page-kicker">Upcoming</p>
                <h2 className="font-display text-2xl font-semibold mt-2 tracking-tight">Your people are out there.</h2>
              </div>
              <span className="rounded-full bg-lime/30 text-ink px-3 py-1 text-[11px] font-bold">Live matching</span>
            </div>
            {loading ? (
              <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-2 animate-pulse" />)}</div>
            ) : upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.map((p) => (
                  <Link key={p.groupId} href={`/chat/${p.groupId}`} className="subtle-card group flex items-center justify-between gap-4 p-4 no-underline transition-transform hover:-translate-y-0.5">
                    <div>
                      <p className="font-semibold text-sm">{p.tableName ?? 'Your table'}</p>
                      <p className="text-xs text-muted mt-1">{new Date(p.meetAt).toLocaleString()} · {p.venueArea ?? 'Venue TBD'}</p>
                      <p className="text-xs text-lilac mt-2 font-semibold">Open group chat</p>
                    </div>
                    <ArrowUpRight size={17} className="text-muted group-hover:text-fg" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-2 p-7 text-center">
                <Sparkles size={22} className="mx-auto text-delulu-punch mb-3" />
                <p className="font-semibold text-sm">{error ? 'Plans are unavailable right now.' : 'No plans yet.'}</p>
                <p className="text-sm text-muted mt-1">{error ?? 'Pick a date and let the algorithm introduce you.'}</p>
              </div>
            )}
          </section>

          <section className="subtle-card p-5 md:p-7">
            <div className="flex items-start gap-3 mb-5">
              <div className="rounded-xl bg-lilac/20 p-2.5 text-lilac"><CalendarDays size={18} /></div>
              <div><p className="page-kicker">Cafe groups</p><h2 className="font-display text-xl font-semibold mt-1">Choose your next date</h2></div>
            </div>
            <p className="text-sm text-muted leading-relaxed mb-5">Meet 4–6 people over coffee. We’ll match the table after you answer a few quick questions.</p>
            <div className="flex items-center gap-2 text-xs text-muted"><Coffee size={14} className="text-tangerine" /> ₹49 · public venue · full refund if unmatched</div>
          </section>
        </div>

        <section className="surface-card p-5 md:p-7 mb-8">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div><p className="page-kicker">Book a table</p><h2 className="font-display text-2xl font-semibold mt-2 tracking-tight">Next 45 days</h2></div>
            <span className="text-xs text-muted">Tap a date to begin</span>
          </div>
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-9 md:grid-cols-10">
            {dates.days.map((d) => {
              const iso = d.toISOString().slice(0, 10)
              const isToday = iso === dates.date
              return (
                <button key={iso} onClick={() => setSelectedDate(iso)} className={`date-cell ${isToday ? 'today' : ''}`}>
                  <span className="text-[10px] uppercase text-muted">{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="text-sm font-bold mt-1">{d.getDate()}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky mt-1" />
                </button>
              )
            })}
          </div>
        </section>
      </div>
      {selectedDate && <CafeBookingSheet date={selectedDate} onClose={() => setSelectedDate(null)} />}
      <BottomNav />
    </div>
  )
}
