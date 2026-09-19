import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'wouter'
import { api } from '@/lib/api'

interface EventDetailData {
  id: string
  title: string
  description: string
  category: string
  date: string
  time: string
  pricePaise: number
  capacity: number
  seatsLeft: number
  attendeesGoing: number
  vibeTags: string[]
  venueName?: string
  venueArea?: string
  hostName?: string
  isDeluluHosted: boolean
  coverImageUrl?: string | null
}

export default function EventDetail() {
  const { id } = useParams()
  const [, navigate] = useLocation()
  const [event, setEvent] = useState<EventDetailData | null>(null)
  const [stage, setStage] = useState<'idle' | 'paying' | 'done'>('idle')
  const [mode, setMode] = useState<'solo' | 'matched' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) api.get<{ event: EventDetailData }>(`/events/${id}`).then((r) => setEvent(r.event))
  }, [id])

  async function book(selectedMode: 'solo' | 'matched') {
    if (!id) return
    setMode(selectedMode)
    setStage('paying')
    setError(null)
    try {
      const booking = await api.post<{ ok: boolean; booking: any; amountPaise: number }>(`/events/${id}/book`, { mode: selectedMode })
      const order = await api.post<{ orderId: string }>('/payments/order', { bookingId: booking.booking.id })
      const mock = await api.post<{ paymentId: string; signature: string }>('/payments/mock/pay', { orderId: order.orderId })
      await api.post('/payments/verify', {
        bookingId: booking.booking.id,
        orderId: order.orderId,
        paymentId: mock.paymentId,
        signature: mock.signature,
      })
      setStage('done')
    } catch (e) {
      setError('Something went wrong with payment.')
      setStage('idle')
    }
  }

  if (!event) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    )
  }

  if (stage === 'done') {
    return (
      <div className="app-shell flex flex-col justify-center items-center px-6 min-h-screen text-center">
        <p className="text-3xl mb-4">🎉</p>
        <h1 className="font-display text-xl font-semibold mb-2">You're in.</h1>
        <p className="text-sm text-muted mb-6">
          {mode === 'matched' ? "We'll match you into a group before the event." : 'Your solo ticket is confirmed.'}
        </p>
        <button onClick={() => navigate('/events')} className="w-full rounded-2xl bg-lime text-ink font-semibold py-4">
          Nice
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell px-6 pt-10 pb-28 min-h-screen">
      <button onClick={() => navigate('/events')} className="text-xs text-muted mb-4">← Events</button>

      {event.coverImageUrl ? (
        <img src={event.coverImageUrl} alt="" className="rounded-2xl h-36 w-full object-cover border border-border mb-4" />
      ) : (
        <div className="rounded-2xl h-36 bg-gradient-to-br from-tangerine/30 to-punch/30 border border-border mb-4" />
      )}

      <h1 className="font-display text-2xl font-semibold mb-1">{event.title}</h1>
      <p className="text-sm text-muted mb-4">
        {event.date} · {event.time} · {event.venueArea}
      </p>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {(event.vibeTags ?? []).map((t) => (
          <span key={t} className="text-[11px] rounded-full bg-surface-2 border border-border px-2 py-0.5">{t}</span>
        ))}
      </div>

      <p className="text-sm text-muted leading-relaxed mb-4">{event.description}</p>

      <div className="rounded-2xl bg-surface-2 border border-border p-4 mb-4 text-sm space-y-1">
        <p>Hosted by: {event.isDeluluHosted ? 'Delulu' : event.hostName ?? 'Partner host'}</p>
        <p>Venue: {event.venueName}</p>
        <p className="text-muted">{event.attendeesGoing} going · avg vibe: chaotic good</p>
        <p className="text-muted">{event.seatsLeft} seats left of {event.capacity}</p>
      </div>

      <details className="rounded-xl bg-surface-2 border border-border p-4 mb-6">
        <summary className="text-sm font-medium cursor-pointer">Refund policy</summary>
        <p className="text-xs text-muted mt-2">Cancel 24h+ before for up to 50% back in credits. Less than 24h: no refund.</p>
      </details>

      {error && <p className="text-punch text-sm mb-4">{error}</p>}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-ink/95 backdrop-blur border-t border-border flex gap-3">
        <button
          onClick={() => book('solo')}
          disabled={stage === 'paying'}
          className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-semibold disabled:opacity-50"
        >
          {stage === 'paying' && mode === 'solo' ? 'Booking…' : `Solo ticket · ₹${(event.pricePaise / 100).toFixed(0)}`}
        </button>
        <button
          onClick={() => book('matched')}
          disabled={stage === 'paying'}
          className="flex-1 rounded-2xl bg-tangerine text-ink font-semibold py-3.5 text-sm disabled:opacity-50"
        >
          {stage === 'paying' && mode === 'matched' ? 'Booking…' : 'Match me into a group'}
        </button>
      </div>
    </div>
  )
}
