import { useState } from 'react'
import { useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import { QUIZ_QUESTIONS, QUIZ_SECTIONS } from '@delulu/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

export default function Quiz() {
  const [, navigate] = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const [index, setIndex] = useState(0)
  const [showInterstitial, setShowInterstitial] = useState<string | null>(QUIZ_SECTIONS[0].interstitial)
  const [skips, setSkips] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [sliderVal, setSliderVal] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [showRomanticPrefs, setShowRomanticPrefs] = useState(false)
  const [preferredGenders, setPreferredGenders] = useState<string[]>([])
  const [ageMin, setAgeMin] = useState(21)
  const [ageMax, setAgeMax] = useState(30)
  const [finishError, setFinishError] = useState<string | null>(null)

  const question = QUIZ_QUESTIONS[index]
  const progress = Math.round((index / QUIZ_QUESTIONS.length) * 100)

  async function answer(value: unknown) {
    await api.post('/quiz/answer', { questionId: question.id, answer: value })
    if (question.id === 'intent_here_for' && (value === 'romantic' || value === 'both')) {
      setShowRomanticPrefs(true)
      return
    }
    advance()
  }

  async function submitRomanticPrefs() {
    await api.post('/quiz/romantic-prefs', { preferredGenders, ageRangeMin: ageMin, ageRangeMax: ageMax })
    setShowRomanticPrefs(false)
    advance()
  }

  function toggleGender(g: string) {
    setPreferredGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  function advance() {
    setSelected([])
    setSliderVal(50)
    const next = index + 1
    if (next >= QUIZ_QUESTIONS.length) {
      finish()
      return
    }
    const nextQ = QUIZ_QUESTIONS[next]
    const prevSection = question.section
    if (nextQ.section !== prevSection) {
      const sec = QUIZ_SECTIONS.find((s) => s.id === nextQ.section)
      if (sec) setShowInterstitial(sec.interstitial)
    }
    setIndex(next)
  }

  async function finish() {
    setSubmitting(true)
    setFinishError(null)
    try {
      const res = await api.post<{ ok: boolean; vibeCard: any }>('/quiz/complete')
      sessionStorage.setItem('delulu_vibe_card', JSON.stringify(res.vibeCard))
      const user = useAuthStore.getState().user
      if (user) setUser({ ...user, onboardingStep: 'avatar' })
      navigate('/onboarding/vibe-card')
    } catch {
      setFinishError("Couldn't finish that up — check your connection and try again.")
      setSubmitting(false)
    }
  }

  function toggleMulti(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (question.maxSelect && prev.length >= question.maxSelect) return prev
      return [...prev, id]
    })
  }

  function skip() {
    if (skips >= 3) return
    setSkips((s) => s + 1)
    advance()
  }

  if (showRomanticPrefs) {
    return (
      <div className="app-shell onboarding-screen px-6 pt-10 pb-10 min-h-screen flex flex-col">
        <h1 className="font-display text-xl font-semibold mb-1">Who are you open to meeting?</h1>
        <p className="text-sm text-muted mb-6">This only affects romantic matching, never friendship tables.</p>

        <p className="text-xs text-muted mb-2">Preferred genders</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {[
            { id: 'male', label: 'Men' },
            { id: 'female', label: 'Women' },
            { id: 'non_binary', label: 'Non-binary' },
            { id: 'prefer_not_to_say', label: 'Open to all' },
          ].map((g) => (
            <button
              key={g.id}
              onClick={() => toggleGender(g.id)}
              className={`rounded-xl border px-3 py-3 text-sm ${preferredGenders.includes(g.id) ? 'border-lime bg-lime/10' : 'border-border bg-surface-2'}`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted mb-2">Age range: {ageMin}–{ageMax}</p>
        <div className="flex gap-3 mb-8">
          <input type="range" min={18} max={60} value={ageMin} onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))} className="w-full accent-lilac" />
          <input type="range" min={18} max={60} value={ageMax} onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))} className="w-full accent-lilac" />
        </div>

        <button
          onClick={submitRomanticPrefs}
          disabled={preferredGenders.length === 0}
          className="w-full rounded-2xl bg-lilac text-ink font-semibold py-4 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    )
  }

  if (showInterstitial) {
    return (
      <div className="app-shell onboarding-screen flex flex-col justify-center items-center px-6 min-h-screen text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-xl font-semibold"
        >
          {showInterstitial}
        </motion.p>
        <button
          onClick={() => setShowInterstitial(null)}
          className="mt-8 rounded-2xl bg-lilac text-ink font-semibold px-8 py-3"
        >
          Let's go
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell onboarding-screen px-6 pt-10 pb-10 min-h-screen flex flex-col">
      <div className="w-full h-1.5 rounded-full bg-surface-2 mb-8">
        <motion.div
          className="h-full rounded-full bg-lime"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="flex-1"
        >
          <h1 className="font-display text-xl font-semibold mb-1">{question.prompt}</h1>
          {question.helper && <p className="text-sm text-muted mb-6">{question.helper}</p>}

          {question.type === 'slider' ? (
            <div className="mt-10">
              <input
                type="range"
                min={0}
                max={100}
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                className="w-full accent-lilac"
              />
              <div className="flex justify-between text-2xl mt-2">
                <span>🐢</span>
                <span>🦩</span>
              </div>
              <button onClick={() => answer(sliderVal)} className="w-full mt-8 rounded-2xl bg-lilac text-ink font-semibold py-4">
                Continue
              </button>
            </div>
          ) : question.type === 'multi' ? (
            <div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {question.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleMulti(opt.id)}
                    className={`rounded-xl border px-3 py-3 text-sm text-left flex items-center gap-2 transition-transform active:scale-[0.97] ${
                      selected.includes(opt.id) ? 'border-lime bg-lime/10 -translate-y-1' : 'border-border bg-surface-2'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                disabled={!question.minSelect || selected.length < question.minSelect}
                onClick={() => answer(selected)}
                className="w-full mt-8 rounded-2xl bg-lilac text-ink font-semibold py-4 disabled:opacity-40"
              >
                Continue ({selected.length}/{question.maxSelect ?? '∞'})
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-4">
              {question.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => answer(opt.id)}
                  className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-left active:scale-[0.98] transition-transform hover:border-lilac"
                >
                  {opt.emoji ? `${opt.emoji} ` : ''}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center mt-8 text-xs text-muted">
        <span>
          Question {index + 1} of {QUIZ_QUESTIONS.length}
        </span>
        <button onClick={skip} disabled={skips >= 3} className="underline disabled:opacity-40">
          Skip ({3 - skips} left)
        </button>
      </div>
      {submitting && <p className="text-center text-sm text-muted mt-4">Cooking up your vibe card… 🍲</p>}
      {finishError && (
        <div className="text-center mt-4">
          <p className="text-sm text-punch">{finishError}</p>
          <button onClick={finish} className="text-sm text-lilac underline mt-2">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
