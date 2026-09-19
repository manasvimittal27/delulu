import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface Dashboard {
  signups: number
  quizCompletions: number
  groupsFormed: number
  gmvPaise: number
  usersWithStrikes: number
  avgCohesion: number
  totalGroupMembers: number
}

interface MatchRun {
  id: string
  track: string
  isDryRun: boolean
  poolSize: number
  groupsFormed: number
  unmatched: number
  avgCohesion: number | null
  createdAt: string
}

interface Slot {
  id: string
  date: string
  window: string
  area: string
  city: string
}

interface AdminUser {
  id: string
  username: string
  phone: string
  strikes: number
  trustScore: number
  suspendedUntil: string | null
  bannedAt: string | null
  role: string
}

const TABS = ['dashboard', 'match runs', 'users', 'hosts & events', 'venues', 'payouts', 'groups', 'safety'] as const
type Tab = (typeof TABS)[number]

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [forbidden, setForbidden] = useState(false)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  useEffect(() => {
    api.get<Dashboard>('/admin/dashboard').then(setDashboard).catch((e) => {
      if (e instanceof ApiError && e.status === 403) setForbidden(true)
    })
  }, [])

  if (!user) {
    return <div className="app-shell flex items-center justify-center min-h-screen"><p className="text-muted text-sm">Sign in first.</p></div>
  }
  if (forbidden || user.role !== 'admin') {
    return <div className="app-shell flex items-center justify-center min-h-screen"><p className="text-muted text-sm">Admins only.</p></div>
  }

  return (
    <div className="app-shell px-4 pt-10 pb-16 min-h-screen">
      <h1 className="font-display text-2xl font-semibold px-2 mb-4">Admin</h1>
      <div className="flex gap-2 overflow-x-auto px-2 mb-6 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs capitalize ${tab === t ? 'bg-lilac text-ink' : 'bg-surface-2 text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && dashboard && (
        <div className="grid grid-cols-2 gap-3 px-2">
          <Stat label="Signups" value={dashboard.signups} />
          <Stat label="Quiz completions" value={dashboard.quizCompletions} />
          <Stat label="Groups formed" value={dashboard.groupsFormed} />
          <Stat label="Avg cohesion" value={dashboard.avgCohesion} />
          <Stat label="GMV" value={`₹${(dashboard.gmvPaise / 100).toFixed(0)}`} />
          <Stat label="Users w/ strikes" value={dashboard.usersWithStrikes} />
        </div>
      )}

      {tab === 'match runs' && <MatchRunsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'hosts & events' && <HostsEventsTab />}
      {tab === 'venues' && <VenuesTab />}
      {tab === 'payouts' && <PayoutsTab />}
      {tab === 'groups' && <GroupsTab />}
      {tab === 'safety' && <SafetyTab />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-surface-2 border border-border p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  )
}

function MatchRunsTab() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [runs, setRuns] = useState<MatchRun[]>([])
  const [eventsList, setEventsList] = useState<{ id: string; title: string; date: string }[]>([])
  const [mode, setMode] = useState<'cafe' | 'event'>('cafe')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [selectedEvent, setSelectedEvent] = useState('')
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ slots: Slot[] }>('/admin/slots').then((r) => setSlots(r.slots))
    api.get<{ runs: MatchRun[] }>('/admin/match-runs').then((r) => setRuns(r.runs))
    api.get<{ events: any[] }>('/admin/events').then((r) => setEventsList(r.events))
  }, [])

  async function run(dryRun: boolean) {
    if (mode === 'cafe') {
      if (!selectedSlot) return
      const r = await api.post<{ groupsFormed: number; unmatched: number; poolSize: number }>('/admin/match-run', {
        slotId: selectedSlot,
        dryRun,
      })
      setResult(`${dryRun ? 'Dry run' : 'Committed'}: pool ${r.poolSize}, ${r.groupsFormed} groups, ${r.unmatched} unmatched`)
    } else {
      if (!selectedEvent) return
      const r = await api.post<{ groupsFormed: number; unmatched: number; poolSize: number }>('/admin/match-run-event', {
        eventId: selectedEvent,
        dryRun,
      })
      setResult(`${dryRun ? 'Dry run' : 'Committed'}: pool ${r.poolSize}, ${r.groupsFormed} groups, ${r.unmatched} unmatched`)
    }
    api.get<{ runs: MatchRun[] }>('/admin/match-runs').then((rr) => setRuns(rr.runs))
  }

  return (
    <div className="px-2">
      <div className="flex gap-2 mb-3">
        {(['cafe', 'event'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-xs capitalize ${mode === m ? 'bg-lilac text-ink' : 'bg-surface-2 text-muted'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'cafe' ? (
        <select value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} className="input mb-3">
          <option value="">Select a slot</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.date} · {s.window} · {s.area}
            </option>
          ))}
        </select>
      ) : (
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="input mb-3">
          <option value="">Select an event</option>
          {eventsList.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} · {e.date}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => run(true)} className="flex-1 rounded-xl border border-border py-2.5 text-sm">Dry run</button>
        <button onClick={() => run(false)} className="flex-1 rounded-xl bg-lilac text-ink font-semibold py-2.5 text-sm">Run matching</button>
      </div>
      {result && <p className="text-xs text-lime mb-4">{result}</p>}

      <div className="space-y-2">
        {runs.map((r) => (
          <div key={r.id} className="rounded-xl bg-surface-2 border border-border p-3 text-xs">
            <p>{new Date(r.createdAt).toLocaleString()} {r.isDryRun && '(dry run)'}</p>
            <p className="text-muted">pool {r.poolSize} · groups {r.groupsFormed} · unmatched {r.unmatched} · cohesion {r.avgCohesion ?? '—'}</p>
          </div>
        ))}
      </div>
      <style>{`.input { width: 100%; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); padding: 12px 16px; font-size: 14px; outline: none; }`}</style>
    </div>
  )
}

function UsersTab() {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])

  useEffect(() => {
    api.get<{ users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q)}`).then((r) => setUsers(r.users))
  }, [q])

  async function action(id: string, path: string) {
    await api.post(`/admin/users/${id}/${path}`)
    api.get<{ users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q)}`).then((r) => setUsers(r.users))
  }

  return (
    <div className="px-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or phone" className="input mb-3" />
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl bg-surface-2 border border-border p-3 text-xs">
            <div className="flex justify-between items-center mb-1">
              <p className="font-medium text-sm">{u.username}</p>
              <span className="text-muted">{u.role}</span>
            </div>
            <p className="text-muted">strikes {u.strikes} · trust {u.trustScore} {u.bannedAt ? '· banned' : u.suspendedUntil ? '· suspended' : ''}</p>
            <div className="flex gap-2 mt-2">
              {u.suspendedUntil ? (
                <button onClick={() => action(u.id, 'unsuspend')} className="rounded-full bg-surface px-2.5 py-1 border border-border">Unsuspend</button>
              ) : (
                <button onClick={() => action(u.id, 'suspend')} className="rounded-full bg-surface px-2.5 py-1 border border-border">Suspend</button>
              )}
              <button onClick={() => action(u.id, 'reset-strikes')} className="rounded-full bg-surface px-2.5 py-1 border border-border">Reset strikes</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`.input { width: 100%; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); padding: 12px 16px; font-size: 14px; outline: none; }`}</style>
    </div>
  )
}

function HostsEventsTab() {
  const [hosts, setHosts] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  function refresh() {
    api.get<{ hosts: any[] }>('/admin/hosts').then((r) => setHosts(r.hosts))
    api.get<{ events: any[] }>('/admin/events?status=pending_approval').then((r) => setEvents(r.events))
  }
  useEffect(refresh, [])

  async function hostAction(id: string, action: 'approve' | 'reject') {
    await api.post(`/admin/hosts/${id}/${action}`)
    refresh()
  }
  async function eventAction(id: string, action: 'approve' | 'reject') {
    await api.post(`/admin/events/${id}/${action}`)
    refresh()
  }

  return (
    <div className="px-2 space-y-6">
      <section>
        <p className="text-xs uppercase text-muted mb-2">Hosts</p>
        <div className="space-y-2">
          {hosts.map((h) => (
            <div key={h.id} className="rounded-xl bg-surface-2 border border-border p-3 text-xs flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{h.name}</p>
                <p className="text-muted">{h.status}</p>
              </div>
              {h.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => hostAction(h.id, 'approve')} className="rounded-full bg-lime text-ink px-2.5 py-1">Approve</button>
                  <button onClick={() => hostAction(h.id, 'reject')} className="rounded-full bg-punch text-ink px-2.5 py-1">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs uppercase text-muted mb-2">Pending events</p>
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="rounded-xl bg-surface-2 border border-border p-3 text-xs flex justify-between items-center">
              <p className="font-medium text-sm">{e.title}</p>
              <div className="flex gap-2">
                <button onClick={() => eventAction(e.id, 'approve')} className="rounded-full bg-lime text-ink px-2.5 py-1">Approve</button>
                <button onClick={() => eventAction(e.id, 'reject')} className="rounded-full bg-punch text-ink px-2.5 py-1">Reject</button>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-xs text-muted">Nothing pending.</p>}
        </div>
      </section>
    </div>
  )
}

function SafetyTab() {
  const [checkins, setCheckins] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])

  useEffect(() => {
    api.get<{ checkins: any[] }>('/admin/safety-checkins').then((r) => setCheckins(r.checkins))
    api.get<{ reports: any[] }>('/admin/reports').then((r) => setReports(r.reports))
  }, [])

  return (
    <div className="px-2 space-y-6">
      <section>
        <p className="text-xs uppercase text-punch mb-2">Need-help alerts</p>
        {checkins.length === 0 && <p className="text-xs text-muted">None right now.</p>}
        {checkins.map((c) => (
          <div key={c.id} className="rounded-xl bg-punch/10 border border-punch/30 p-3 text-xs mb-2">
            group {c.groupId} · {new Date(c.createdAt).toLocaleString()}
          </div>
        ))}
      </section>
      <section>
        <p className="text-xs uppercase text-muted mb-2">Reports</p>
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl bg-surface-2 border border-border p-3 text-xs mb-2">
            {r.category} {r.resolved ? '· resolved' : ''}
          </div>
        ))}
      </section>
    </div>
  )
}

interface Venue {
  id: string
  name: string
  city: string
  area: string
  address: string
  capacity: number
  active: boolean
}

function VenuesTab() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [showForm, setShowForm] = useState(false)

  function refresh() {
    api.get<{ venues: Venue[] }>('/admin/venues').then((r) => setVenues(r.venues))
  }
  useEffect(refresh, [])

  async function toggleActive(v: Venue) {
    await api.patch(`/admin/venues/${v.id}`, { active: !v.active })
    refresh()
  }

  return (
    <div className="px-2">
      <button onClick={() => setShowForm(true)} className="w-full rounded-2xl bg-lilac text-ink font-semibold py-3 text-sm mb-4">
        + New venue
      </button>
      <div className="space-y-2">
        {venues.map((v) => (
          <div key={v.id} className="rounded-xl bg-surface-2 border border-border p-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{v.name}</p>
                <p className="text-muted mt-0.5">{v.area}, {v.city} · cap {v.capacity}</p>
              </div>
              <button
                onClick={() => toggleActive(v)}
                className={`text-[10px] px-2 py-0.5 rounded-full ${v.active ? 'bg-lime/20 text-lime' : 'bg-punch/20 text-punch'}`}
              >
                {v.active ? 'active' : 'inactive'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {showForm && <NewVenueForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); refresh() }} />}
    </div>
  )
}

function NewVenueForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')
  const [capacity, setCapacity] = useState('6')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    try {
      await api.post('/admin/venues', { name, city, area, address, capacity: Number(capacity), active: true })
      onCreated()
    } catch {
      setError('Something went wrong')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-surface border-t border-border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">New venue</h2>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input" />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="input" />
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area" className="input" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="input" />
          <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity" className="input" />
        </div>
        {error && <p className="text-punch text-sm mt-3">{error}</p>}
        <button onClick={submit} className="w-full mt-6 rounded-2xl bg-lilac text-ink font-semibold py-4">Create</button>
        <button onClick={onClose} className="w-full text-center text-xs text-muted mt-4">Cancel</button>
        <style>{`.input { width: 100%; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); padding: 12px 16px; font-size: 14px; outline: none; }`}</style>
      </div>
    </div>
  )
}

function PayoutsTab() {
  const [payouts, setPayouts] = useState<any[]>([])

  function refresh() {
    api.get<{ payouts: any[] }>('/admin/payouts').then((r) => setPayouts(r.payouts))
  }
  useEffect(refresh, [])

  async function setStatus(id: string, status: string) {
    const upiRef = status === 'paid' ? prompt('UPI reference (optional)') ?? undefined : undefined
    await api.post(`/admin/payouts/${id}/status`, { status, upiRef })
    refresh()
  }

  return (
    <div className="px-2 space-y-2">
      {payouts.length === 0 && <p className="text-xs text-muted">No payouts generated yet.</p>}
      {payouts.map((p) => (
        <div key={p.id} className="rounded-xl bg-surface-2 border border-border p-3 text-xs">
          <p>Gross ₹{(p.grossPaise / 100).toFixed(0)} · Host payable ₹{(p.hostPayablePaise / 100).toFixed(0)}</p>
          <p className="text-muted mt-0.5">Status: {p.status} {p.upiRef ? `· ${p.upiRef}` : ''}</p>
          <div className="flex gap-2 mt-2">
            {['pending', 'processing', 'paid'].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(p.id, s)}
                className={`rounded-full px-2.5 py-1 border ${p.status === s ? 'bg-lilac text-ink border-lilac' : 'border-border bg-surface'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupsTab() {
  const [groupId, setGroupId] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [newMemberId, setNewMemberId] = useState('')

  async function load() {
    if (!groupId) return
    const d = await api.get(`/admin/groups/${groupId}`)
    setDetail(d)
  }

  async function cancelGroup() {
    if (!confirm('Cancel this group and refund all members?')) return
    await api.post(`/admin/groups/${groupId}/cancel`)
    load()
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member from the group?')) return
    await api.post(`/admin/groups/${groupId}/members/${userId}/remove`)
    load()
  }

  async function addMember() {
    if (!newMemberId) return
    await api.post(`/admin/groups/${groupId}/members/add`, { userId: newMemberId })
    setNewMemberId('')
    load()
  }

  return (
    <div className="px-2">
      <div className="flex gap-2 mb-4">
        <input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="Group ID" className="input flex-1" />
        <button onClick={load} className="rounded-xl bg-lilac text-ink px-4 text-sm font-semibold">Load</button>
      </div>

      {detail && (
        <div>
          <div className="rounded-xl bg-surface-2 border border-border p-3 text-xs mb-3">
            <p className="font-medium text-sm">{detail.group.tableName}</p>
            <p className="text-muted mt-0.5">Status: {detail.group.status} · Cohesion: {detail.group.cohesionScore}</p>
          </div>

          <p className="text-xs uppercase text-muted mb-2">Members</p>
          <div className="space-y-2 mb-4">
            {detail.members.map((m: any) => (
              <div key={m.userId} className="flex justify-between items-center rounded-xl bg-surface-2 border border-border p-3 text-xs">
                <span>{m.username}</span>
                <button onClick={() => removeMember(m.userId)} className="text-punch">Remove</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} placeholder="User ID to add" className="input flex-1" />
            <button onClick={addMember} className="rounded-xl border border-border px-4 text-xs">Add</button>
          </div>

          {detail.group.status !== 'cancelled' && (
            <button onClick={cancelGroup} className="w-full rounded-2xl bg-punch text-ink font-semibold py-3 text-sm">
              Cancel group + refund all
            </button>
          )}
        </div>
      )}
      <style>{`.input { width: 100%; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); padding: 12px 16px; font-size: 14px; outline: none; }`}</style>
    </div>
  )
}
