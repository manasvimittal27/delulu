import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { AvatarIcon, AVATAR_COLORS } from '@/components/AvatarIcon'

export default function AvatarPicker() {
  const [, navigate] = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const [avatars, setAvatars] = useState<string[]>([])
  const [avatarId, setAvatarId] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [username, setUsername] = useState('')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<{ avatars: string[] }>('/identity/avatars').then((r) => {
      setAvatars(r.avatars)
      setAvatarId(r.avatars[0])
    })
    shuffle()
  }, [])

  async function shuffle() {
    const r = await api.get<{ username: string }>('/identity/username/suggest')
    setUsername(r.username)
    checkAvailable(r.username)
  }

  async function checkAvailable(name: string) {
    if (name.length < 3) return setAvailable(null)
    const r = await api.get<{ available: boolean; reason?: string }>(`/identity/username/check?username=${encodeURIComponent(name)}`)
    setAvailable(r.available)
  }

  async function submit() {
    setError(null)
    setLoading(true)
    try {
      const res = await api.post<{ ok: boolean; user: any }>('/identity/avatar', {
        avatarId,
        avatarColor: color,
        username,
      })
      const user = useAuthStore.getState().user
      setUser(user ? { ...user, username: res.user.username, avatarId: res.user.avatarId, onboardingStep: 'done' } : null)
      navigate('/plans')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell px-6 pt-14 pb-10 min-h-screen">
      <h1 className="font-display text-2xl font-semibold mb-1">Pick your look</h1>
      <p className="text-sm text-muted mb-6">This is how you'll show up. Forever anonymous, always you.</p>

      <div className="flex justify-center mb-6">
        <AvatarIcon avatarId={avatarId} color={color} size={96} />
      </div>

      <div className="grid grid-cols-6 gap-2 mb-6">
        {avatars.map((id) => (
          <button
            key={id}
            onClick={() => setAvatarId(id)}
            className={`rounded-xl p-1 ${avatarId === id ? 'ring-2 ring-lime' : ''}`}
          >
            <AvatarIcon avatarId={id} color={color} size={40} />
          </button>
        ))}
      </div>

      <div className="flex gap-2 justify-center mb-8">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{ background: c }}
            className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-offset-ink ring-fg' : ''}`}
          />
        ))}
      </div>

      <label className="text-xs text-muted mb-1 block">Username</label>
      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
            setUsername(v)
            checkAvailable(v)
          }}
          className="flex-1 rounded-xl bg-surface-2 border border-border px-4 py-3 text-sm outline-none"
        />
        <button onClick={shuffle} className="rounded-xl border border-border px-4 text-sm">
          Shuffle
        </button>
      </div>
      {available === false && <p className="text-punch text-xs mt-1">That username is taken or not allowed</p>}
      {available === true && <p className="text-lime text-xs mt-1">Available</p>}

      <div className="mt-4 rounded-xl bg-surface-2 border border-border p-3 text-sm flex items-center gap-2">
        <AvatarIcon avatarId={avatarId} color={color} size={28} />
        <span className="text-muted">Preview:</span>
        <span className="font-medium">{username || 'your_username'}</span>
      </div>

      {error && <p className="text-punch text-sm mt-4">{error}</p>}

      <button
        onClick={submit}
        disabled={loading || available === false || username.length < 3}
        className="w-full mt-8 rounded-2xl bg-lilac text-ink font-semibold py-4 disabled:opacity-40"
      >
        {loading ? 'Saving…' : "That's me →"}
      </button>
    </div>
  )
}
