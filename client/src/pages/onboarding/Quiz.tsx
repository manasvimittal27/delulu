import { useState } from 'react'
import { useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import { QUIZ_QUESTIONS, QUIZ_SECTIONS, PERSONALITY_QUESTIONS, SUB_INTERESTS } from '@delulu/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const CATEGORY_QUESTION = QUIZ_QUESTIONS.find((q) => q.id === 'interests_categories')!
const INTENT_QUESTIONS = QUIZ_QUESTIONS.filter((q) => q.section === 'intent')

type Phase = 'categories' | 'subinterests' | 'personality' | 'intent'

export default function Quiz() {
  const [, navigate] = useLocation()
  const setUser = useAuthStore((s) => s.setUser)

  const [phase, setPhase] = useState<Phase>('categories')
  const [showInterstitial, setShowInterstitial] = useState<string | null>(QUIZ_SECTIONS[0].interstitial)
  const [skips, setSkips] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  // categories phase
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // sub-interests phase
  const [subInterestIndex, setSubInterestIndex] = useState(0)
  const [subInterestSelected, setSubInterestSelected] = useState<string[]>([])

  // personality phase
  const [personalityIndex, setPersonalityIndex] = useState(0)

  // intent phase
  const [intentIndex, setIntentIndex] = useState(0)
  const [showRomanticPrefs, setShowRomanticPrefs] = useState(false)
  const [preferredGenders, setPreferredGenders] = useState<string[]>([])
  const [ageMin, setAgeMin] = useState(21)
  const [ageMax, setAgeMax] = useState(30)

  const totalQuestions = 1 + selectedCategories.length + PERSONALITY_QUESTIONS.length + INTENT_QUESTIONS.length
  const answeredSoFar =
    phase === 'categories'
      ? 0
      : phase === 'subinterests'
        ? 1 + subInterestIndex
        : phase === 'personality'
          ? 1 + selectedCategories.length + personalityIndex
          : 1 + selectedCategories.length + PERSONALITY_QUESTIONS.length + intentIndex
  const progress = Math.round((answeredSoFar / totalQuestions) * 100)

  async function submitCategories(categories: string[]) {
    await api.post('/quiz/answer', { questionId: 'interests_categories', answer: categories })
    setSelectedCategories(categories)
    if (categories.length > 0) {
      setPhase('subinterests')
      setSubInterestIndex(0)
      setSubInterestSelected([])
    } else {
      goToPersonality()
    }
  }

  async function submitSubInterest(category: string, slugs: string[]) {
    await api.post('/quiz/answer', { questionId: `sub_interest:${category}`, answer: slugs })
    const next = subInterestIndex + 1
    if (next >= selectedCategories.length) {
      goToPersonality()
    } else {
      setSubInterestIndex(next)
      setSubInterestSelected([])
    }
  }

  function goToPersonality() {
    setPhase('personality')
    setPersonalityIndex(0)
    setShowInterstitial(QUIZ_SECTIONS[1].interstitial)
  }

  async function submitPersonality(value: string) {
    const question = PERSONALITY_QUESTIONS[personalityIndex]
    await api.post('/quiz/answer', { questionId: question.id, answer: value })
    const next = personalityIndex + 1
    if (next >= PERSONALITY_QUESTIONS.length) {
      setPhase('intent')
      setIntentIndex(0)
      setShowInterstitial(QUIZ_SECTIONS[2].interstitial)
    } else {
      setPersonalityIndex(next)
    }
  }

  async function submitIntent(value: string) {
    const question = INTENT_QUESTIONS[intentIndex]
    await api.post('/quiz/answer', { questionId: question.id, answer: value })
    if (question.id === 'intent_here_for' && (value === 'romantic' || value === 'both')) {
      setShowRomanticPrefs(true)
      return
    }
    advanceIntent()
  }

  function advanceIntent() {
    const next = intentIndex + 1
    if (next >= INTENT_QUESTIONS.length) {
      finish()
    } else {
      setIntentIndex(next)
    }
  }

  async function submitRomanticPrefs() {
    await api.post('/quiz/romantic-prefs', { preferredGenders, ageRangeMin: ageMin, ageRangeMax: ageMax })
    setShowRomanticPrefs(false)
    advanceIntent()
  }

  function toggleGender(g: string) {
    setPreferredGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
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

  function skip() {
    if (skips >= 3) return
    setSkips((s) => s + 1)
    if (phase === 'subinterests') {
      const next = subInterestIndex + 1
      if (next >= selectedCategories.length) goToPersonality()
      else {
        setSubInterestIndex(next)
        setSubInterestSelected([])
      }
    } else if (phase === 'personality') {
      const next = personalityIndex + 1
      if (next >= PERSONALITY_QUESTIONS.length) {
        setPhase('intent')
        setIntentIndex(0)
        setShowInterstitial(QUIZ_SECTIONS[2].interstitial)
      } else setPersonalityIndex(next)
    } else if (phase === 'intent') {
      advanceIntent()
    }
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
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-xl font-semibold">
          {showInterstitial}
        </motion.p>
        <button onClick={() => setShowInterstitial(null)} className="mt-8 rounded-2xl bg-lilac text-ink font-semibold px-8 py-3">
          Let's go
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell onboarding-screen px-6 pt-10 pb-10 min-h-screen flex flex-col">
      <div className="w-full h-1.5 rounded-full bg-surface-2 mb-8">
        <motion.div className="h-full rounded-full bg-lime" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'categories' && (
          <CategoriesStep key="categories" onSubmit={submitCategories} />
        )}

        {phase === 'subinterests' && (
          <SubInterestStep
            key={`sub-${subInterestIndex}`}
            category={selectedCategories[subInterestIndex]}
            index={subInterestIndex}
            total={selectedCategories.length}
            selected={subInterestSelected}
            setSelected={setSubInterestSelected}
            onSubmit={(slugs) => submitSubInterest(selectedCategories[subInterestIndex], slugs)}
          />
        )}

        {phase === 'personality' && (
          <PersonalityStep key={`p-${personalityIndex}`} question={PERSONALITY_QUESTIONS[personalityIndex]} onSubmit={submitPersonality} />
        )}

        {phase === 'intent' && (
          <IntentStep key={`i-${intentIndex}`} question={INTENT_QUESTIONS[intentIndex]} onSubmit={submitIntent} />
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mt-8 text-xs text-muted">
        <span>
          Question {answeredSoFar + 1} of {totalQuestions}
        </span>
        {phase !== 'categories' && (
          <button onClick={skip} disabled={skips >= 3} className="underline disabled:opacity-40">
            Skip ({3 - skips} left)
          </button>
        )}
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

function CategoriesStep({ onSubmit }: { onSubmit: (categories: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const min = CATEGORY_QUESTION.minSelect ?? 3
  const max = CATEGORY_QUESTION.maxSelect ?? 6

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= max) return prev
      return [...prev, id]
    })
  }

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="flex-1">
      <h1 className="font-display text-xl font-semibold mb-1">{CATEGORY_QUESTION.prompt}</h1>
      {CATEGORY_QUESTION.helper && <p className="text-sm text-muted mb-6">{CATEGORY_QUESTION.helper}</p>}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {CATEGORY_QUESTION.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
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
        disabled={selected.length < min}
        onClick={() => onSubmit(selected)}
        className="w-full mt-8 rounded-2xl bg-lilac text-ink font-semibold py-4 disabled:opacity-40"
      >
        Continue ({selected.length}/{max})
      </button>
    </motion.div>
  )
}

function SubInterestStep({
  category,
  index,
  total,
  selected,
  setSelected,
  onSubmit,
}: {
  category: string
  index: number
  total: number
  selected: string[]
  setSelected: (fn: (prev: string[]) => string[]) => void
  onSubmit: (slugs: string[]) => void
}) {
  const data = SUB_INTERESTS[category]
  if (!data) return null

  function toggle(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug)
      if (prev.length >= 5) return prev
      return [...prev, slug]
    })
  }

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="flex-1">
      <p className="text-xs text-muted mb-1">Interest {index + 1} of {total}</p>
      <h1 className="font-display text-xl font-semibold mb-1">{data.prompt}</h1>
      <p className="text-sm text-muted mb-6">Pick 1-5</p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.options.map((opt) => (
          <button
            key={opt.slug}
            onClick={() => toggle(opt.slug)}
            className={`rounded-xl border px-3 py-3 text-sm text-left transition-transform active:scale-[0.97] ${
              selected.includes(opt.slug) ? 'border-lime bg-lime/10 -translate-y-1' : 'border-border bg-surface-2'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        disabled={selected.length < 1}
        onClick={() => onSubmit(selected)}
        className="w-full mt-8 rounded-2xl bg-lilac text-ink font-semibold py-4 disabled:opacity-40"
      >
        Continue ({selected.length}/5)
      </button>
    </motion.div>
  )
}

function PersonalityStep({ question, onSubmit }: { question: (typeof PERSONALITY_QUESTIONS)[number]; onSubmit: (value: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="flex-1">
      <h1 className="font-display text-xl font-semibold mb-6">{question.prompt}</h1>
      <div className="flex flex-col gap-2 mt-4">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSubmit(opt.value)}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-left active:scale-[0.98] transition-transform hover:border-lilac"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function IntentStep({ question, onSubmit }: { question: (typeof QUIZ_QUESTIONS)[number]; onSubmit: (value: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="flex-1">
      <h1 className="font-display text-xl font-semibold mb-6">{question.prompt}</h1>
      <div className="flex flex-col gap-2 mt-4">
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSubmit(opt.id)}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-left active:scale-[0.98] transition-transform hover:border-lilac"
          >
            {opt.emoji ? `${opt.emoji} ` : ''}
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
