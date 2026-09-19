import { useState } from 'react'
import { useLocation } from 'wouter'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function ProfileSetup() {
  const [, navigate] = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [pincode, setPincode] = useState('')
  const [gender, setGender] = useState('prefer_not_to_say')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [waitlisted, setWaitlisted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError(null)
    if (!terms) {
      setError('Please accept the terms to continue')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ ok: boolean; user?: any; waitlist?: boolean }>('/auth/profile', {
        email,
        dob,
        pincode,
        gender,
        termsAccepted: true,
      })
      if (res.waitlist) {
        setWaitlisted(true)
        return
      }
      setUser(res.user)
      navigate('/onboarding/quiz')
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setBlocked(true)
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  if (blocked) {
    return (
      <div className="app-shell flex flex-col justify-center items-center px-6 min-h-screen text-center">
        <p className="text-3xl mb-4">🫶</p>
        <h1 className="font-display text-xl font-semibold mb-2">Not yet, delulu</h1>
        <p className="text-muted text-sm">Delulu is currently 18+. Come back when you're eligible 🫶</p>
      </div>
    )
  }

  if (waitlisted) {
    return (
      <div className="app-shell flex flex-col justify-center items-center px-6 min-h-screen text-center">
        <p className="text-3xl mb-4">🗺️</p>
        <h1 className="font-display text-xl font-semibold mb-2">You're on the list</h1>
        <p className="text-muted text-sm">We're not in your area yet, but we'll ping you the moment we are.</p>
      </div>
    )
  }

  return (
    <div className="app-shell px-6 pt-16 pb-10 min-h-screen">
      <h1 className="font-display text-2xl font-semibold mb-1">A few basics</h1>
      <p className="text-sm text-muted mb-6">This stays private. No public profile, ever.</p>

      <div className="space-y-4">
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input" placeholder="you@example.com" />
        </Field>
        <Field label="Date of birth">
          <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" className="input" />
        </Field>
        <Field label="Pincode">
          <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input" placeholder="560001" />
        </Field>
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="input">
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>

        <label className="flex items-start gap-2 text-sm text-muted pt-2">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
          I agree to the Terms and Safety Guidelines
        </label>
      </div>

      {error && <p className="text-punch text-sm mt-4">{error}</p>}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full mt-8 rounded-2xl bg-lilac text-ink font-semibold py-4 disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Continue'}
      </button>

      <style>{`.input { width: 100%; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); padding: 12px 16px; font-size: 14px; outline: none; }`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      {children}
    </div>
  )
}
