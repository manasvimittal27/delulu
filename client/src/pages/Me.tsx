import { useLocation } from 'wouter'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { BottomNav } from '@/components/BottomNav'
import { AvatarIcon } from '@/components/AvatarIcon'

const RELIABILITY_LABEL: Record<string, string> = {
  excellent: 'Reliability: Excellent',
  good: 'Reliability: Good',
  shaky: 'Reliability: Shaky',
}

export default function Me() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [, navigate] = useLocation()

  async function logout() {
    await api.post('/auth/logout')
    setUser(null)
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="app-shell pb-28">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4">
        <AvatarIcon avatarId={user.avatarId ?? 'blob'} color={user.avatarColor ?? '#A78BFA'} size={64} />
        <div>
          <h1 className="font-display text-xl font-semibold">{user.username}</h1>
          <p className="text-xs text-muted mt-1">{RELIABILITY_LABEL[user.reliability]}</p>
        </div>
      </header>

      <div className="px-6 space-y-3">
        <div className="rounded-2xl bg-surface-2 border border-border p-4 flex justify-between text-sm">
          <span className="text-muted">Credits</span>
          <span className="font-medium">₹{(user.creditsPaise / 100).toFixed(2)}</span>
        </div>
        <div className="rounded-2xl bg-surface-2 border border-border p-4 flex justify-between text-sm">
          <span className="text-muted">City</span>
          <span className="font-medium">{user.city}</span>
        </div>
        <a href="/me/emergency-contacts" className="block rounded-2xl bg-surface-2 border border-border p-4 text-sm">
          Emergency contacts →
        </a>
        {user.role !== 'user' && (
          <div className="rounded-2xl bg-surface-2 border border-border p-4 text-sm">
            <span className="text-muted">Role: {user.role}</span>
          </div>
        )}
        <a href="/host" className="block rounded-2xl border border-border py-3.5 text-sm text-center">
          Host portal
        </a>
        {user.role === 'admin' && (
          <a href="/admin" className="block rounded-2xl border border-border py-3.5 text-sm text-center">
            Admin
          </a>
        )}
        <button onClick={logout} className="w-full rounded-2xl border border-border py-3.5 text-sm text-punch mt-6">
          Log out
        </button>

        <div className="flex gap-3 flex-wrap justify-center pt-6">
          {['safety', 'terms', 'privacy', 'refunds', 'hosts'].map((p) => (
            <a key={p} href={`/legal/${p}`} className="text-xs text-muted underline capitalize">
              {p}
            </a>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
