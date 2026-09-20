import { useEffect, useState } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { useLocation } from 'wouter'
import { motion } from 'framer-motion'

interface VibeCardData { archetype: string; description: string; topInterests: string[]; socialEnergy: number }

export default function VibeCard() {
  const [, navigate] = useLocation()
  const [card, setCard] = useState<VibeCardData | null>(null)
  useEffect(() => { const raw = sessionStorage.getItem('delulu_vibe_card'); if (raw) setCard(JSON.parse(raw)) }, [])
  if (!card) return <div className="app-shell status-screen"><div className="loading-mark"><span /><span /><span /></div></div>
  return <div className="app-shell vibe-screen"><motion.div initial={{ opacity: 0, y: 18, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }} className="vibe-card"><div className="flex items-center justify-between"><span className="page-kicker text-ink/60">Your Delulu vibe</span><Sparkles size={19} /></div><p className="text-xs text-ink/60 mt-12">You’re the kind of person who...</p><h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3">{card.archetype}</h1><p className="text-ink/75 leading-relaxed mt-4 max-w-lg">{card.description}</p><div className="mt-8 flex gap-2 flex-wrap">{card.topInterests.map((interest) => <span key={interest} className="rounded-full bg-ink/10 px-3 py-1.5 text-xs font-semibold capitalize">{interest}</span>)}</div><div className="mt-12"><div className="flex justify-between text-xs text-ink/60"><span>slow burn</span><span>room energy</span></div><div className="h-2 rounded-full bg-ink/10 mt-2 relative"><div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-ink border-4 border-lime" style={{ left: `calc(${card.socialEnergy}% - 8px)` }} /></div></div></motion.div><div className="vibe-actions"><p className="text-xs text-muted flex items-center justify-center gap-2"><Sparkles size={13} /> A little data. A lot of potential.</p><button onClick={() => navigate('/onboarding/avatar')} className="primary-button w-full mt-5">Pick your avatar <ArrowUpRight size={17} /></button></div></div>
}
