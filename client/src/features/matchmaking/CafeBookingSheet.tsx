import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

const AREAS = [
  'Delhi · Hauz Khas',
  'Delhi · Connaught Place',
  'Delhi · Greater Kailash',
  'Delhi · Saket',
  'Gurugram · Cyber Hub',
  'Gurugram · Sector 29',
  'Gurugram · Golf Course Road',
  'Noida · Sector 18',
  'Noida · Sector 62',
  'Faridabad · Sector 15',
  'Ghaziabad · Indirapuram',
]
const WINDOWS: { id: string; label: string }[] = [
  { id: 'morning', label: 'Morning · 10:00' },
  { id: 'afternoon', label: 'Afternoon · 15:00' },
  { id: 'evening', label: 'Evening · 18:30' },
  { id: 'night', label: 'Night · 20:30' },
]

type Stage = 'window' | 'area' | 'group' | 'review' | 'paying' | 'pool'

export function CafeBookingSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('window')
  const [window_, setWindow] = useState<string | null>(null)
  const [area, setArea] = useState<string | null>(null)
  const [groupSize, setGroupSize] = useState<string | number>('surprise')
  const [intent, setIntent] = useState<'friendship' | 'romantic' | 'both'>('friendship')
  const [groupComfort, setGroupComfort] = useState<'mixed' | 'same_gender' | 'no_preference'>('mixed')
  const [poolCount, setPoolCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (window_ && area) {
      api
        .get<{ count: number }>(`/plans/pool-count?date=${date}&window=${window_}&area=${encodeURIComponent(area)}`)
        .then((r) => setPoolCount(r.count))
        .catch(() => setPoolCount(null))
    }
  }, [window_, area, date])

  async function pay() {
    setError(null)
    setStage('paying')
    try {
      const booking = await api.post<{ ok: boolean; booking: any; amountPaise: number }>('/plans/cafe/book', {
        date,
        window: window_,
        area,
        groupSize,
        intent,
        groupComfort,
      })
      const order = await api.post<{ orderId: string; provider: string }>('/payments/order', {
        bookingId: booking.booking.id,
      })
      const mock = await api.post<{ paymentId: string; signature: string }>('/payments/mock/pay', {
        orderId: order.orderId,
      })
      await api.post('/payments/verify', {
        bookingId: booking.booking.id,
        orderId: order.orderId,
        paymentId: mock.paymentId,
        signature: mock.signature,
      })
      setStage('pool')
    } catch (e) {
      setError('Payment failed. Your ₹49 was never charged.')
      setStage('review')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="modal-sheet rounded-t-3xl bg-surface border-t border-border p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />

        {stage === 'window' && (
          <div>
            <h2 className="font-display text-lg font-semibold mb-4">What are you in the mood for?</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="rounded-2xl border border-sky bg-sky/10 p-4 text-left">
                <p className="text-xs text-sky font-semibold">Cafe Date</p>
                <p className="font-display text-lg font-semibold mt-1">₹49</p>
              </button>
              <button className="rounded-2xl border border-border p-4 text-left opacity-50" disabled>
                <p className="text-xs text-tangerine font-semibold">Events</p>
                <p className="font-display text-lg font-semibold mt-1">from ₹299</p>
              </button>
            </div>
            <p className="text-xs text-muted mb-2">Time window</p>
            <div className="grid grid-cols-2 gap-2">
              {WINDOWS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { setWindow(w.id); setStage('area') }}
                  className="rounded-xl border border-border bg-surface-2 py-3 text-sm"
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'area' && (
          <div>
            <h2 className="font-display text-lg font-semibold mb-4">Where's good for you?</h2>
            <div className="grid grid-cols-2 gap-2">
              {AREAS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setArea(a); setStage('group') }}
                  className="rounded-xl border border-border bg-surface-2 py-3 text-sm"
                >
                  {a}
                </button>
              ))}
            </div>
            {poolCount !== null && (
              <p className="text-xs text-muted mt-4">{poolCount} people looking so far</p>
            )}
          </div>
        )}

        {stage === 'group' && (
          <div>
            <h2 className="font-display text-lg font-semibold mb-1">Group preferences</h2>
            {poolCount !== null && <p className="text-xs text-muted mb-4">{poolCount} people looking in {area}, {window_}</p>}

            <p className="text-xs text-muted mb-2">Group size</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[4, 5, 6, 'surprise'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupSize(g)}
                  className={`rounded-xl border py-2.5 text-sm ${groupSize === g ? 'border-lime bg-lime/10' : 'border-border bg-surface-2'}`}
                >
                  {g === 'surprise' ? '🎲' : g}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted mb-2">Intent</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['friendship', 'romantic', 'both'] as const).map((i) => (
                <button
                  key={i}
                  onClick={() => setIntent(i)}
                  className={`rounded-xl border py-2.5 text-xs capitalize ${intent === i ? 'border-lime bg-lime/10' : 'border-border bg-surface-2'}`}
                >
                  {i}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted mb-2">Comfort level for your first meet</p>
            <div className="flex flex-col gap-2 mb-6">
              {[
                { id: 'mixed', label: 'Mixed group, definitely' },
                { id: 'same_gender', label: 'Prefer same-gender group first' },
                { id: 'no_preference', label: 'No preference' },
              ].map((o) => (
                <button
                  key={o.id}
                  onClick={() => setGroupComfort(o.id as any)}
                  className={`rounded-xl border py-2.5 text-sm text-left px-3 ${groupComfort === o.id ? 'border-lime bg-lime/10' : 'border-border bg-surface-2'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <button onClick={() => setStage('review')} className="w-full rounded-2xl bg-lilac text-ink font-semibold py-4">
              Review
            </button>
          </div>
        )}

        {stage === 'review' && (
          <div>
            <h2 className="font-display text-lg font-semibold mb-4">Review</h2>
            <div className="rounded-2xl bg-surface-2 border border-border p-4 space-y-1 text-sm mb-4">
              <p>{date} · {WINDOWS.find((w) => w.id === window_)?.label}</p>
              <p>{area}</p>
              <p>Group of {groupSize === 'surprise' ? 'surprise' : groupSize} · {intent}</p>
            </div>
            <p className="text-xs text-muted mb-6">If we can't find your people, you get your ₹49 back. Promise.</p>
            {error && <p className="text-punch text-sm mb-4">{error}</p>}
            <button onClick={pay} className="w-full rounded-2xl bg-lilac text-ink font-semibold py-4">
              Pay ₹49
            </button>
          </div>
        )}

        {stage === 'paying' && (
          <div className="py-10 text-center">
            <p className="text-3xl mb-4 animate-pulse">🍲</p>
            <p className="text-sm text-muted">Cooking up your table… stirring the vibes</p>
          </div>
        )}

        {stage === 'pool' && (
          <div className="py-6 text-center">
            <p className="text-3xl mb-4">🎉</p>
            <h2 className="font-display text-lg font-semibold mb-2">You're in.</h2>
            <p className="text-sm text-muted mb-6">We match at 8 PM the night before. Sit tight.</p>
            <button onClick={onClose} className="w-full rounded-2xl bg-lime text-ink font-semibold py-4">
              Nice
            </button>
          </div>
        )}

        {stage !== 'paying' && stage !== 'pool' && (
          <button onClick={onClose} className="w-full text-center text-xs text-muted mt-6">
            Cancel
          </button>
        )}
      </motion.div>
    </div>
  )
}
