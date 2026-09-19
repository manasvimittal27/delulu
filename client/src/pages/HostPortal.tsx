import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Host {
  id: string
  name: string
  status: 'pending' | 'verified' | 'rejected'
}

interface HostEvent {
  id: string
  title: string
  date: string
  status: string
  pricePaise: number
  capacity: number
}

export default function HostPortal() {
  const [host, setHost] = useState<Host | null | undefined>(undefined)
  const [events, setEvents] = useState<HostEvent[]>([])
  const [tab, setTab] = useState<'events' | 'earnings'>('events')
  const [earnings, setEarnings] = useState<{ totalPaise: number } | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    api.get<{ host: Host | null }>('/host/me').then((r) => setHost(r.host))
  }, [])

  useEffect(() => {
    if (host?.status === 'verified') {
      api.get<{ events: HostEvent[] }>('/host/events').then((r) => setEvents(r.events))
      api.get<{ totalPaise: number }>('/host/earnings').then(setEarnings)
    }
  }, [host])

  if (host === undefined) {
    return <div className="app-shell flex items-center justify-center min-h-screen"><p className="text-muted text-sm">Loading…</p></div>
  }

  if (!host) return <ApplyForm onApplied={(h) => setHost(h)} />

  if (host.status === 'pending') {
    return (
      <div className="app-shell flex flex-col justify-center items-center px-6 min-h-screen text-center">
        <p className="text-3xl mb-4">⏳</p>
        <h1 className="font-display text-xl font-semibold mb-2">Application under review</h1>
        <p className="text-sm text-muted">We'll be in touch once our team reviews your host application.</p>
      </div>
    )
  }

  if (host.status === 'rejected') {
    return (
      <div className="app-shell flex flex-col justify-center items-center px-6 min-h-screen text-center">
        <p className="text-sm text-muted">Your host application wasn't approved this time.</p>
      </div>
    )
  }

  return (
    <div className="app-shell px-6 pt-12 pb-28 min-h-screen">
      <h1 className="font-display text-2xl font-semibold mb-1">Host dashboard</h1>
      <p className="text-sm text-muted mb-6">{host.name}</p>

      <div className="flex gap-2 mb-6">
        {(['events', 'earnings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${tab === t ? 'bg-lilac text-ink' : 'bg-surface-2 text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div>
          <button onClick={() => setShowForm(true)} className="w-full rounded-2xl bg-lilac text-ink font-semibold py-3.5 mb-4">
            + New event
          </button>
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="rounded-2xl bg-surface-2 border border-border p-4">
                <p className="font-medium text-sm">{e.title}</p>
                <p className="text-xs text-muted mt-1">
                  {e.date} · ₹{(e.pricePaise / 100).toFixed(0)} · {e.capacity} seats
                </p>
                <span className="text-[10px] uppercase tracking-wide text-tangerine mt-1 inline-block">{e.status.replace('_', ' ')}</span>
              </div>
            ))}
            {events.length === 0 && <p className="text-sm text-muted text-center py-8">No events yet.</p>}
          </div>
        </div>
      )}

      {tab === 'earnings' && (
        <div className="rounded-2xl bg-surface-2 border border-border p-6 text-center">
          <p className="text-xs text-muted mb-1">Total payable</p>
          <p className="font-display text-2xl font-semibold">₹{((earnings?.totalPaise ?? 0) / 100).toFixed(2)}</p>
        </div>
      )}

      {showForm && <NewEventForm onClose={() => setShowForm(false)} onCreated={(e) => { setEvents((prev) => [...prev, e]); setShowForm(false) }} />}
    </div>
  )
}

function ApplyForm({ onApplied }: { onApplied: (h: Host) => void }) {
  const [name, setName] = useState('')
  const [organization, setOrganization] = useState('')
  const [instagram, setInstagram] = useState('')
  const [concept, setConcept] = useState('')
  const [upiId, setUpiId] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    if (!name || !concept || !upiId) {
      setError('Name, concept, and UPI ID are required')
      return
    }
    try {
      const res = await api.post<{ ok: boolean; host: Host }>('/host/apply', { name, organization, instagram, concept, upiId })
      onApplied(res.host)
    } catch (e) {
      setError('Something went wrong')
    }
  }

  return (
    <div className="app-shell px-6 pt-12 pb-10 min-h-screen">
      <h1 className="font-display text-2xl font-semibold mb-1">Become a host</h1>
      <p className="text-sm text-muted mb-6">Run curated experiences on Delulu.</p>
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input" />
        <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Organization (optional)" className="input" />
        <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram handle" className="input" />
        <textarea value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Your event concept" rows={3} className="input" />
        <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="UPI ID for payouts" className="input" />
      </div>
      {error && <p className="text-punch text-sm mt-3">{error}</p>}
      <button onClick={submit} className="w-full mt-6 rounded-2xl bg-lilac text-ink font-semibold py-4">Submit application</button>
      <style>{`.input { width: 100%; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); padding: 12px 16px; font-size: 14px; outline: none; }`}</style>
    </div>
  )
}

function NewEventForm({ onClose, onCreated }: { onClose: () => void; onCreated: (e: HostEvent) => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [area, setArea] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:30')
  const [price, setPrice] = useState('299')
  const [capacity, setCapacity] = useState('8')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/uploads/event-cover', { method: 'POST', credentials: 'include', body: form })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Upload failed')
      setCoverImageUrl(body.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    setError(null)
    try {
      const res = await api.post<{ ok: boolean; event: HostEvent }>('/host/events', {
        title,
        category,
        city,
        area,
        date,
        time,
        pricePaise: Math.round(Number(price) * 100),
        capacity: Number(capacity),
        coverImageUrl: coverImageUrl ?? undefined,
      })
      onCreated(res.event)
    } catch {
      setError('Something went wrong — check the fields and try again')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-surface border-t border-border p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="font-display text-lg font-semibold mb-4">New event</h2>
        <div className="space-y-3">
          {coverImageUrl ? (
            <div className="relative">
              <img src={coverImageUrl} alt="Cover" className="w-full h-32 object-cover rounded-xl" />
              <button
                onClick={() => setCoverImageUrl(null)}
                className="absolute top-2 right-2 rounded-full bg-ink/70 text-fg text-xs px-2 py-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="block rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted cursor-pointer">
              {uploading ? 'Uploading…' : 'Upload cover image'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="hidden" />
            </label>
          )}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. trivia)" className="input" />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="input" />
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" className="input" />
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="input" />
          <input value={time} onChange={(e) => setTime(e.target.value)} type="time" className="input" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (₹)" className="input" />
          <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity" className="input" />
        </div>
        {error && <p className="text-punch text-sm mt-3">{error}</p>}
        <button onClick={submit} className="w-full mt-6 rounded-2xl bg-lilac text-ink font-semibold py-4">Submit for approval</button>
        <button onClick={onClose} className="w-full text-center text-xs text-muted mt-4">Cancel</button>
        <style>{`.input { width: 100%; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); padding: 12px 16px; font-size: 14px; outline: none; }`}</style>
      </div>
    </div>
  )
}
