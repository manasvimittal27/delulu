import { motion } from 'framer-motion'
import { Link } from 'wouter'
import { useState } from 'react'
import { api } from '@/lib/api'

const STEPS = [
  'Tell us your vibe',
  'Pick a date',
  'Get matched into a group chat',
  'Show up',
]

const FAQS = [
  { q: 'Is this a dating app?', a: "Not exactly. You'll meet a small group of strangers — some people find something romantic, most just make friends. No swiping, no browsing." },
  { q: 'Is it safe?', a: 'Phone-verified users, public venues only, check-ins, and a one-tap emergency flow. Your number is never shown to anyone.' },
  { q: "What happens if I'm shy?", a: "Most people are a little nervous. That's the whole point of a structured icebreaker and a small table — way easier than a party." },
  { q: "What if someone doesn't show?", a: "Confirmed no-shows get a strike. You're never penalized for someone else flaking." },
  { q: 'How do refunds work?', a: "Cafe tables: full refund if we can't match you. Cancel 24h+ before and you're covered too." },
  { q: 'Can I bring my friend?', a: 'Not to your table — the whole idea is meeting new people. But you can add them to your Delulu Circle after.' },
  { q: 'How does matching work?', a: 'A real compatibility algorithm using your quiz answers — interests, personality, values, lifestyle — not random luck.' },
  { q: 'Can other people see my number?', a: 'Never. Not your phone, not your email, not your exact location.' },
]

export default function Landing() {
  const [waitlistCity, setWaitlistCity] = useState('')
  const [waitlistDone, setWaitlistDone] = useState(false)

  async function joinWaitlist() {
    if (!waitlistCity.trim()) return
    await api.post('/waitlist', { city: waitlistCity.trim() })
    setWaitlistDone(true)
  }

  return (
    <div className="app-shell overflow-x-hidden">
      <section className="relative px-6 pt-16 pb-14 overflow-hidden">
        <motion.div
          className="absolute -top-24 -left-20 w-64 h-64 rounded-full bg-lilac/30 blur-3xl"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-10 -right-16 w-56 h-56 rounded-full bg-punch/30 blur-3xl"
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex items-center gap-2 mb-10">
          {['🐸', '👽', '🍄', '🐧'].map((e, i) => (
            <motion.span
              key={e}
              className="w-9 h-9 rounded-full bg-surface-2 border border-border grid place-items-center text-base"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {e}
            </motion.span>
          ))}
          <span className="text-xs text-muted ml-1">40+ strangers online in Bengaluru</span>
        </div>

        <h1 className="relative font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight">
          Be delulu.
          <br />
          Show up anyway.
        </h1>
        <p className="relative mt-4 text-muted text-[15px] leading-relaxed max-w-[360px]">
          Meet 4 strangers over coffee. No photos, no swiping, no small talk about the weather.
        </p>

        <div className="relative mt-8 flex flex-col gap-3">
          <Link
            href="/join"
            className="w-full text-center rounded-2xl bg-lilac text-ink font-semibold py-4 active:scale-[0.98] transition-transform"
          >
            Book a cafe table →
          </Link>
          <Link
            href="/events"
            className="w-full text-center rounded-2xl border border-border py-4 font-medium text-fg"
          >
            Browse events
          </Link>
        </div>
      </section>

      <section className="px-6 py-10 border-t border-border">
        <h2 className="font-display text-xl font-semibold mb-6">How it works</h2>
        <div className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-border grid place-items-center text-xs font-semibold">
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && <div className="w-px h-6 bg-border" />}
              </div>
              <p className="text-sm py-1.5">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-10 border-t border-border grid grid-cols-1 gap-4">
        <h2 className="font-display text-xl font-semibold">Two tracks</h2>
        <div className="rounded-2xl p-5 bg-gradient-to-br from-sky/20 to-lilac/20 border border-border">
          <p className="text-xs uppercase tracking-wide text-sky font-semibold">Cafe</p>
          <p className="font-display text-2xl font-semibold mt-1">₹49 · 4–6 people</p>
          <p className="text-sm text-muted mt-1">90 minutes at a partner cafe near you.</p>
        </div>
        <div className="rounded-2xl p-5 bg-gradient-to-br from-tangerine/20 to-punch/20 border border-border">
          <p className="text-xs uppercase tracking-wide text-tangerine font-semibold">Events</p>
          <p className="font-display text-2xl font-semibold mt-1">From ₹299 · 6–10 people</p>
          <p className="text-sm text-muted mt-1">Curated experiences, hosted or Delulu-matched.</p>
        </div>
      </section>

      <section className="px-6 py-10 border-t border-border">
        <h2 className="font-display text-xl font-semibold mb-2">The anonymity promise</h2>
        <p className="text-sm text-muted leading-relaxed">
          You're an avatar + username until 2 hours before the meetup. Then first names unlock — 2 hours before you meet.
          <br />
          <span className="text-fg font-medium">No photo uploads. Ever.</span>
        </p>
      </section>

      <section className="px-6 py-10 border-t border-border">
        <h2 className="font-display text-xl font-semibold mb-3">Safety, built in</h2>
        <ul className="text-sm text-muted space-y-2 leading-relaxed">
          <li>Public venues only. We like mystery, not unnecessary risk.</li>
          <li>Phone verification for every account.</li>
          <li>Check-in on arrival + a post-meetup safety check.</li>
          <li>One-tap report, and no-show accountability.</li>
          <li>Your phone number never appears to other members.</li>
        </ul>
      </section>

      <section className="px-6 py-10 border-t border-border">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">Example Delulu table</p>
        <div className="rounded-2xl bg-surface-2 border border-border p-4 space-y-3 text-sm">
          <p className="font-medium text-fg">Table 4 — The Feral Croissants</p>
          <p className="text-muted italic">"What is the weirdest fact you know?"</p>
          <p>🐸 <span className="text-lilac">chaotic_samosa:</span> "Octopuses have three hearts."</p>
          <p>👽 <span className="text-punch">midnight_gremlin:</span> "Okay mine is much worse..."</p>
          <p>🍄 <span className="text-lime">velvet_penguin:</span> "I once..."</p>
        </div>
      </section>

      <section className="px-6 py-10 border-t border-border">
        <h2 className="font-display text-xl font-semibold mb-2">Not in your city yet?</h2>
        <p className="text-sm text-muted mb-4">Join the waitlist and we'll ping you when Delulu lands near you.</p>
        {waitlistDone ? (
          <p className="text-sm text-lime">You're on the list. The algorithm has entered the chat.</p>
        ) : (
          <div className="flex gap-2">
            <input
              value={waitlistCity}
              onChange={(e) => setWaitlistCity(e.target.value)}
              placeholder="Your city"
              className="flex-1 rounded-xl bg-surface-2 border border-border px-4 py-3 text-sm outline-none focus:border-lilac"
            />
            <button
              onClick={joinWaitlist}
              className="rounded-xl bg-lime text-ink font-semibold px-4 py-3 text-sm"
            >
              Join
            </button>
          </div>
        )}
      </section>

      <section className="px-6 py-10 border-t border-border pb-28">
        <h2 className="font-display text-xl font-semibold mb-4">FAQ</h2>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-xl bg-surface-2 border border-border p-4">
              <summary className="text-sm font-medium cursor-pointer">{f.q}</summary>
              <p className="text-sm text-muted mt-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-border flex gap-4 flex-wrap justify-center pb-32">
        {['safety', 'terms', 'privacy', 'refunds', 'hosts'].map((p) => (
          <a key={p} href={`/legal/${p}`} className="text-xs text-muted underline capitalize">
            {p}
          </a>
        ))}
      </footer>
    </div>
  )
}
