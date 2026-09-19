import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const days: Date[] = []
    const today = new Date()
    for (let i = 0; i < 45; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    setDates({ date: today.toISOString().slice(0, 10), days })

    Promise.all([
      api.get<{ plans: UpcomingPlan[] }>('/plans/upcoming').catch(() => ({ plans: [] })),
    ]).then(([up]) => {
      setUpcoming(up.plans)
      setLoading(false)
    })
  }, [])

  return (
    <div className="app-shell pb-28">
      <header className="px-6 pt-12 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Plans</h1>
          <p className="text-sm text-muted">Pick a date. See who shows up.</p>
        </div>
        <NotificationBell />
      </header>

      {loading ? (
        <div className="px-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      ) : upcoming.length > 0 ? (
        <section className="px-6 mb-6">
          <p className="text-xs uppercase tracking-wide text-muted mb-2">Upcoming plans</p>
          <div className="space-y-2">
            {upcoming.map((p) => (
              <Link
                key={p.groupId}
                href={`/chat/${p.groupId}`}
                className="block rounded-2xl bg-surface-2 border border-border p-4 active:scale-[0.98] transition-transform"
              >
                <p className="font-medium text-sm">{p.tableName ?? 'Your table'}</p>
                <p className="text-xs text-muted mt-1">
                  {new Date(p.meetAt).toLocaleString()} · {p.venueArea ?? 'Venue TBD'}
                </p>
                <p className="text-xs text-lilac mt-2">Open chat →</p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="px-6 mb-6">
          <div className="rounded-2xl bg-surface-2 border border-border p-6 text-center">
            <p className="text-2xl mb-2">🫠</p>
            <p className="text-sm text-muted">No plans yet. Tragic. Pick a date →</p>
          </div>
        </section>
      )}

      <section className="px-6">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">Next 45 days</p>
        <div className="grid grid-cols-7 gap-1.5">
          {dates.days.map((d) => {
            const iso = d.toISOString().slice(0, 10)
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className="aspect-square rounded-xl bg-surface-2 border border-border flex flex-col items-center justify-center text-xs gap-1"
              >
                <span>{d.getDate()}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky" />
              </button>
            )
          })}
        </div>
      </section>

      {selectedDate && (
        <CafeBookingSheet date={selectedDate} onClose={() => setSelectedDate(null)} />
      )}

      <BottomNav />
    </div>
  )
}
