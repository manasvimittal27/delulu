import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { api } from '@/lib/api'
import { BottomNav } from '@/components/BottomNav'
import { AvatarIcon } from '@/components/AvatarIcon'

interface UpcomingPlan {
  groupId: string
  tableName: string | null
  meetAt: string
  venueArea?: string
}

interface CircleEntry {
  chatRoomId: string
  user: { id: string; username: string; avatarId: string; avatarColor: string; firstName?: string } | null
}

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
    <div className="app-shell pb-28">
      <header className="px-6 pt-12 pb-4">
        <h1 className="font-display text-2xl font-semibold">Chats</h1>
        <p className="text-sm text-muted">Your tables and your Delulu Circle.</p>
      </header>

      <div className="px-6 space-y-6">
        {loading && [0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-surface-2 animate-pulse" />)}

        {empty && (
          <div className="rounded-2xl bg-surface-2 border border-border p-6 text-center">
            <p className="text-2xl mb-2">👻</p>
            <p className="text-sm text-muted">No conversations yet. Book a table to start one.</p>
          </div>
        )}

        {!loading && tables!.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wide text-muted mb-2">Tables</p>
            <div className="space-y-2">
              {tables!.map((t) => (
                <Link key={t.groupId} href={`/chat/${t.groupId}`} className="block rounded-2xl bg-surface-2 border border-border p-4">
                  <p className="font-medium text-sm">{t.tableName ?? 'Your table'}</p>
                  <p className="text-xs text-muted mt-1">{new Date(t.meetAt).toLocaleString()} · {t.venueArea}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && circle!.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wide text-muted mb-2">Delulu Circle</p>
            <div className="space-y-2">
              {circle!.map((c) => (
                <div key={c.chatRoomId} className="flex items-center gap-3 rounded-2xl bg-surface-2 border border-border p-3">
                  {c.user && <AvatarIcon avatarId={c.user.avatarId} color={c.user.avatarColor} size={36} />}
                  <span className="text-sm font-medium">{c.user?.firstName ?? c.user?.username}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
