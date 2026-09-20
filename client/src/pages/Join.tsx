import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, LockKeyhole, Sparkles } from 'lucide-react'
import { useLocation } from 'wouter'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

type Step = 'phone' | 'otp'

export default function Join() {
  const [, navigate] = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  async function requestOtp() {
    setError(null)
    if (!/^[6-9]\d{9}$/.test(phone)) { setError('Enter a valid 10-digit number'); return }
    setLoading(true)
    try { const res = await api.post<{ ok: boolean; devOtp?: string }>('/auth/otp/request', { phone }); setDevOtp(res.devOtp ?? null); setStep('otp') }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Something went wrong') }
    finally { setLoading(false) }
  }
  function handleOtpChange(i: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]; next[i] = value; setOtp(next)
    if (value && i < 5) inputsRef.current[i + 1]?.focus()
    if (next.every((d) => d)) verifyOtp(next.join(''))
  }
  function handlePaste(e: React.ClipboardEvent) { const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (text.length === 6) { setOtp(text.split('')); verifyOtp(text) } }
  async function verifyOtp(code: string) {
    setError(null); setLoading(true)
    try { const res = await api.post<{ ok: boolean; user: any }>('/auth/otp/verify', { phone, otp: code }); setUser(res.user); navigate(res.user.onboardingStep === 'done' ? '/plans' : `/onboarding/${res.user.onboardingStep}`) }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Invalid OTP'); setOtp(['', '', '', '', '', '']); inputsRef.current[0]?.focus() }
    finally { setLoading(false) }
  }

  return (
    <div className="app-shell auth-screen">
      <div className="auth-layout">
        <aside className="auth-aside"><div><p className="page-kicker text-white/60">The first move</p><h1 className="font-display text-5xl font-semibold text-white tracking-tight mt-5">A little brave.<br /><span className="editorial-serif text-lime">A lot more alive.</span></h1><p className="text-white/65 leading-relaxed mt-6 max-w-sm">Delulu is for the moment before you almost cancel. Meet strangers in real life, without the pressure to perform.</p></div><div className="flex items-center gap-2 text-xs text-white/55"><LockKeyhole size={14} /> Your phone stays private. Always.</div></aside>
        <main className="auth-panel"><div className="mb-10"><span className="inline-flex rounded-full bg-lilac/15 text-lilac px-3 py-1.5 text-xs font-bold items-center gap-2"><Sparkles size={13} /> 18+ · Delhi NCR & beyond</span></div>
          <AnimatePresence mode="wait">
            {step === 'phone' ? <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .22 }}><p className="page-kicker">Step 01 / Verify your number</p><h2 className="font-display text-4xl font-semibold tracking-tight mt-3">What’s your number?</h2><p className="text-muted mt-3 leading-relaxed">We’ll text you a code. No spam, no public profile, no weird follow-up.</p><div className="flex items-center gap-3 rounded-2xl bg-surface-2 border border-border px-4 py-4 mt-8"><span className="text-muted font-semibold">+91</span><input autoFocus inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="98765 43210" className="flex-1 bg-transparent outline-none text-lg tracking-wide text-fg" /></div>{error && <p className="text-punch text-sm mt-2">{error}</p>}<button onClick={requestOtp} disabled={loading} className="primary-button w-full mt-5">{loading ? 'Sending…' : 'Send code'} <ArrowUpRight size={17} /></button></motion.div> : <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .22 }}><p className="page-kicker">Step 02 / One small tap</p><h2 className="font-display text-4xl font-semibold tracking-tight mt-3">Enter the code</h2><p className="text-muted mt-3">Sent to +91 {phone}</p>{devOtp && <p className="text-xs text-lime mt-3">Dev mode — your OTP is {devOtp}</p>}<div className="flex gap-2 justify-between mt-8" onPaste={handlePaste}>{otp.map((digit, i) => <input key={i} ref={(el) => { inputsRef.current[i] = el }} inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => { if (e.key === 'Backspace' && !digit && i > 0) inputsRef.current[i - 1]?.focus() }} className="otp-input" />)}</div>{error && <p className="text-punch text-sm mt-3">{error}</p>}<button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']) }} className="text-sm text-muted mt-7 underline">Change number</button></motion.div>}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
