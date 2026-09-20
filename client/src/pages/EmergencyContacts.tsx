import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { api, ApiError } from '@/lib/api'

interface Contact {
  id: string
  name: string
  phone: string
}

export default function EmergencyContacts() {
  const [, navigate] = useLocation()
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      const r = await api.get<{ contacts: Contact[] }>('/safety/emergency-contacts')
      setContacts(r.contacts)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to load emergency contacts')
    }
  }
  useEffect(() => { void refresh() }, [])

  async function add() {
    setError(null)
    if (!name.trim() || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a name and a valid 10-digit number')
      return
    }
    try {
      await api.post('/safety/emergency-contacts', { name: name.trim(), phone })
      setName('')
      setPhone('')
      await refresh()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unable to save emergency contact')
    }
  }

  return (
    <div className="app-shell page-detail px-6 pt-12 pb-10 min-h-screen">
      <button onClick={() => navigate('/me')} className="text-xs text-muted mb-4">← Me</button>
      <h1 className="font-display text-2xl font-semibold mb-1">Emergency contacts</h1>
      <p className="text-sm text-muted mb-6">Used only if you flag "Need help" after a meetup. Never shown to other members.</p>

      {contacts === null && <div className="h-16 rounded-2xl bg-surface-2 animate-pulse mb-4" />}

      {contacts?.length === 0 && (
        <div className="rounded-2xl bg-surface-2 border border-border p-6 text-center mb-6">
          <p className="text-sm text-muted">No emergency contacts yet.</p>
        </div>
      )}

      <div className="space-y-2 mb-6">
        {contacts?.map((c) => (
          <div key={c.id} className="rounded-2xl bg-surface-2 border border-border p-4 flex justify-between">
            <span className="text-sm font-medium">{c.name}</span>
            <span className="text-sm text-muted">+91 {c.phone}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-surface-2 border border-border p-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-sm outline-none" />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit phone"
          className="w-full rounded-xl bg-surface border border-border px-4 py-3 text-sm outline-none"
        />
        {error && <p className="text-punch text-xs">{error}</p>}
        <button onClick={add} className="w-full rounded-xl bg-lilac text-ink font-semibold py-3 text-sm">
          Add contact
        </button>
      </div>
    </div>
  )
}
