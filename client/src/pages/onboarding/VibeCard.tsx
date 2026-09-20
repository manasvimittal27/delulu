import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Download, Sparkles } from 'lucide-react'
import { useLocation } from 'wouter'
import { motion } from 'framer-motion'
import { toPng } from 'html-to-image'

interface VibeCardData {
  archetype: string
  description: string
  topInterests: string[]
  dialListenLead: number
  dialBanterDepth: number
}

function Dial({ left, right, value }: { left: string; right: string; value: number }) {
  return (
    <div className="mt-6">
      <div className="flex justify-between text-xs text-ink/60">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="h-2 rounded-full bg-ink/10 mt-2 relative">
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-ink border-4 border-lime" style={{ left: `calc(${value}% - 8px)` }} />
      </div>
    </div>
  )
}

export default function VibeCard() {
  const [, navigate] = useLocation()
  const [card, setCard] = useState<VibeCardData | null>(null)
  const [sharing, setSharing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const raw = sessionStorage.getItem('delulu_vibe_card')
    if (raw) setCard(JSON.parse(raw))
  }, [])

  async function shareCard() {
    if (!cardRef.current) return
    setSharing(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = 'delulu-vibe-card.png'
      link.href = dataUrl
      link.click()
    } finally {
      setSharing(false)
    }
  }

  if (!card) {
    return (
      <div className="app-shell status-screen">
        <div className="loading-mark"><span /><span /><span /></div>
      </div>
    )
  }

  return (
    <div className="app-shell vibe-screen">
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 18, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 16 }}
        className="vibe-card"
      >
        <div className="flex items-center justify-between">
          <span className="page-kicker text-ink/60">Your Delulu vibe</span>
          <Sparkles size={19} />
        </div>
        <p className="text-xs text-ink/60 mt-12">You're the kind of person who...</p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3">{card.archetype}</h1>
        <p className="text-ink/75 leading-relaxed mt-4 max-w-lg">{card.description}</p>

        {card.topInterests.length > 0 && (
          <div className="mt-8 flex gap-2 flex-wrap">
            {card.topInterests.map((interest) => (
              <span key={interest} className="rounded-full bg-ink/10 px-3 py-1.5 text-xs font-semibold capitalize">
                {interest}
              </span>
            ))}
          </div>
        )}

        <Dial left="Listens" right="Leads" value={card.dialListenLead} />
        <Dial left="Banter" right="Depth" value={card.dialBanterDepth} />

        <p className="text-[11px] text-ink/40 font-semibold tracking-wide mt-10">delulu</p>
      </motion.div>

      <div className="vibe-actions">
        <p className="text-xs text-muted flex items-center justify-center gap-2">
          <Sparkles size={13} /> A little data. A lot of potential.
        </p>
        <button onClick={shareCard} disabled={sharing} className="secondary-button w-full mt-5 disabled:opacity-60">
          {sharing ? 'Saving…' : 'Share my vibe card'} <Download size={16} />
        </button>
        <button onClick={() => navigate('/onboarding/avatar')} className="primary-button w-full mt-3">
          Pick your avatar <ArrowUpRight size={17} />
        </button>
      </div>
    </div>
  )
}
