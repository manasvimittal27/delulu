import { useEffect, useState } from 'react'
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
    <div className="app-shell pb-28">
      <header className="px-6 pt-12 pb-4">
        <h1 className="font-display text-2xl font-semibold">Events</h1>
        <p className="text-sm text-muted">Curated experiences with 6-10 strangers.</p>
      </header>

      <div className="px-6 space-y-3">
        {events === null &&
          [0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-surface-2 animate-pulse" />)}

        {events?.length === 0 && (
          <div className="rounded-2xl bg-surface-2 border border-border p-6 text-center">
            <p className="text-2xl mb-2">🎲</p>
            <p className="text-sm text-muted">Nothing chaotic here yet. Check another date.</p>
          </div>
        )}

        {events?.map((e) => (
          <Link
            key={e.id}
            href={`/events/${e.id}`}
            className="block rounded-2xl border border-border bg-gradient-to-br from-tangerine/15 to-punch/15 overflow-hidden active:scale-[0.98] transition-transform"
          >
            {e.coverImageUrl && <img src={e.coverImageUrl} alt="" className="w-full h-32 object-cover" />}
            <div className="flex justify-between items-start p-4">
              <div>
                <p className="font-display text-base font-semibold">{e.title}</p>
                <p className="text-xs text-muted mt-1">
                  {e.date} · {e.time} · {e.area}
                </p>
              </div>
              <span className="text-sm font-semibold text-tangerine">₹{(e.pricePaise / 100).toFixed(0)}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap px-4 pb-4">
              {(e.vibeTags ?? []).map((t) => (
                <span key={t} className="text-[11px] rounded-full bg-surface-2 border border-border px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
