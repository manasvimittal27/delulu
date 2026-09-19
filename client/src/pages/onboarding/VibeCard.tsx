import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { motion } from 'framer-motion'

interface VibeCardData {
  archetype: string
  description: string
  topInterests: string[]
  socialEnergy: number
}

export default function VibeCard() {
  const [, navigate] = useLocation()
  const [card, setCard] = useState<VibeCardData | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('delulu_vibe_card')
    if (raw) setCard(JSON.parse(raw))
  }, [])

  if (!card) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <p className="text-muted text-sm">Loading your vibe…</p>
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-col justify-center items-center px-6 min-h-screen text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
        className="w-full rounded-3xl p-6 bg-gradient-to-br from-lilac/30 via-punch/20 to-tangerine/20 border border-border"
      >
        <p className="text-xs uppercase tracking-widest text-muted mb-2">Your Delulu vibe</p>
        <h1 className="font-display text-2xl font-semibold">{card.archetype}</h1>
        <p className="text-sm text-muted mt-2">{card.description}</p>

        <div className="mt-6 flex justify-center gap-2 flex-wrap">
          {card.topInterests.map((i) => (
            <span key={i} className="text-xs rounded-full bg-surface-2 border border-border px-3 py-1 capitalize">
              {i}
            </span>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-xl">
            <span>🐢</span>
            <span>🦩</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 mt-1 relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-lime"
              style={{ left: `${card.socialEnergy}%` }}
            />
          </div>
        </div>
      </motion.div>

      <p className="text-xs text-muted mt-4">Delulu · vibe card</p>

      <button
        onClick={() => navigate('/onboarding/avatar')}
        className="w-full mt-8 rounded-2xl bg-lilac text-ink font-semibold py-4"
      >
        Pick your avatar →
      </button>
    </div>
  )
}
