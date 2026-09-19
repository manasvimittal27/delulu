import { useState, useRef } from 'react'
import { useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
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
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit number')
      return
    }
    setLoading(true)
    try {
      const res = await api.post<{ ok: boolean; devOtp?: string }>('/auth/otp/request', { phone })
      setDevOtp(res.devOtp ?? null)
      setStep('otp')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(i: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[i] = value
    setOtp(next)
    if (value && i < 5) inputsRef.current[i + 1]?.focus()
    if (next.every((d) => d)) verifyOtp(next.join(''))
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      verifyOtp(text)
    }
  }

  async function verifyOtp(code: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await api.post<{ ok: boolean; user: any }>('/auth/otp/verify', { phone, otp: code })
      setUser(res.user)
      navigate(res.user.onboardingStep === 'done' ? '/plans' : `/onboarding/${res.user.onboardingStep}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invalid OTP')
      setOtp(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell flex flex-col justify-center px-6 min-h-screen">
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            <h1 className="font-display text-2xl font-semibold mb-2">What's your number?</h1>
            <p className="text-sm text-muted mb-6">We'll text you a code. No spam, promise.</p>
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 border border-border px-4 py-4">
              <span className="text-muted font-medium">+91</span>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                className="flex-1 bg-transparent outline-none text-lg tracking-wide"
              />
            </div>
            {error && <p className="text-punch text-sm mt-2">{error}</p>}
            <button
              onClick={requestOtp}
              disabled={loading}
              className="w-full mt-6 rounded-2xl bg-lilac text-ink font-semibold py-4 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            <h1 className="font-display text-2xl font-semibold mb-2">Enter the code</h1>
            <p className="text-sm text-muted mb-2">Sent to +91 {phone}</p>
            {devOtp && (
              <p className="text-xs text-lime mb-4">Dev mode — your OTP is {devOtp}</p>
            )}
            <div className="flex gap-2 justify-between" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el }}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && i > 0) inputsRef.current[i - 1]?.focus()
                  }}
                  className="w-11 h-14 text-center text-xl rounded-xl bg-surface-2 border border-border outline-none focus:border-lilac"
                />
              ))}
            </div>
            {error && <p className="text-punch text-sm mt-3">{error}</p>}
            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']) }}
              className="text-sm text-muted mt-6 underline"
            >
              Change number
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
