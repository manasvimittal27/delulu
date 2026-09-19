import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'wouter'
import { ArrowUpRight, Coffee, HeartHandshake, LockKeyhole, MapPin, MessageCircle, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { api } from '@/lib/api'
import heroImage from '@/assets/delulu/hero-social-table.jpg'
import cafeImage from '@/assets/delulu/track-cafe.jpg'
import experienceImage from '@/assets/delulu/track-experience.jpg'
import communityImage from '@/assets/delulu/community-laugh.jpg'

const STEPS = [
  { title: 'Tell us your vibe', body: 'A quick, low-pressure quiz helps us understand what kind of energy feels right.' },
  { title: 'Pick a date', body: 'Choose a cafe table or a curated experience in your city.' },
  { title: 'Get your table', body: 'Meet a small group of strangers in a chat before you meet IRL.' },
  { title: 'Show up', body: 'No swiping. No performance. Just one good reason to leave the house.' },
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
  const [waitlistError, setWaitlistError] = useState<string | null>(null)

  async function joinWaitlist() {
    if (!waitlistCity.trim()) return
    setWaitlistError(null)
    try {
      await api.post('/waitlist', { city: waitlistCity.trim() })
      setWaitlistDone(true)
    } catch (e) {
      setWaitlistError(e instanceof Error ? e.message : 'Unable to join the waitlist right now')
    }
  }

  return (
    <div className="app-shell overflow-x-hidden">
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="page-kicker flex items-center gap-2"><Sparkles size={13} /> A social experiment for real life</p>
          <h1 className="display-xl">Be delulu.<br /><span className="editorial-serif">Show up anyway.</span></h1>
          <p>Meet 4–6 strangers over coffee, or find your people through a curated experience. No photos, no swiping, no small talk about the weather.</p>
          <div className="hero-actions">
            <Link href="/join" className="primary-button">Book a table <ArrowUpRight size={17} /></Link>
            <Link href="/events" className="secondary-button">Browse experiences <ArrowUpRight size={16} /></Link>
          </div>
          <div className="hero-proof">
            <div className="proof-dots" aria-hidden="true"><span><UsersRound size={13} /></span><span><Coffee size={13} /></span><span><HeartHandshake size={13} /></span></div>
            <span>For people who want more than another group chat.</span>
          </div>
        </div>
        <div className="hero-visual">
          <img className="hero-image" src={heroImage} alt="Friends getting to know each other around a cafe table" />
          <div className="hero-image-frame" />
          <motion.div className="hero-note hero-note-one" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .35 }}><LockKeyhole size={15} /> Avatars first. Names later.</motion.div>
          <motion.div className="hero-note hero-note-two" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .55 }}><MessageCircle size={15} /> 4 strangers. One table.</motion.div>
        </div>
      </section>

      <section id="how-it-works" className="story-section">
        <div className="story-intro">
          <p className="page-kicker">01 / How it works</p>
          <div>
            <h2>Less screen time. More <span className="editorial-serif">plot twists.</span></h2>
            <p className="mt-5">Delulu makes the first move easier. We take care of the matching and the structure — you just decide to show up.</p>
          </div>
        </div>
        <div className="step-grid">
          {STEPS.map((step, i) => (
            <div key={step.title} className="step-card">
              <div className="step-number">0{i + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tracks" className="story-section">
        <div className="story-intro">
          <p className="page-kicker">02 / Pick your energy</p>
          <div>
            <h2>Two ways to meet <span className="editorial-serif">your people.</span></h2>
            <p className="mt-5">Same no-pressure spirit, different setting. Choose what feels like a good story waiting to happen.</p>
          </div>
        </div>
        <div className="track-grid">
          <article className="track-card">
            <img src={cafeImage} alt="Friends talking over coffee at a cafe" />
            <div className="track-card-content">
              <span className="track-pill"><Coffee size={14} /> The cafe table</span>
              <h3>Small table. Big conversation.</h3>
              <p>4–6 people, one cosy cafe, 90 minutes, and a few prompts to get the conversation moving.</p>
            </div>
          </article>
          <article className="track-card">
            <img src={experienceImage} alt="Young adults making pottery together" />
            <div className="track-card-content">
              <span className="track-pill"><Sparkles size={14} /> Curated experiences</span>
              <h3>Do something, together.</h3>
              <p>6–10 people, from pottery and art to fitness and whatever your city is curious about next.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="story-section">
        <div className="promise-grid">
          <article className="promise-card highlight">
            <LockKeyhole size={24} strokeWidth={1.8} />
            <h3>Be a username before you are a profile.</h3>
            <p>You're an avatar and a vibe until two hours before the meetup. No photo uploads. No browsing people like products.</p>
          </article>
          <article className="promise-card">
            <ShieldCheck size={24} color="var(--delulu-punch)" strokeWidth={1.8} />
            <h3>Soft landing, built in.</h3>
            <ul>
              <li>Public venues only.</li>
              <li>Phone verification for every account.</li>
              <li>Arrival check-ins and a one-tap report.</li>
              <li>Your phone number never appears to other members.</li>
            </ul>
          </article>
        </div>
        <div className="mt-4 overflow-hidden rounded-[26px] relative min-h-[260px]">
          <img src={communityImage} alt="A group of friends laughing together after meeting" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent" />
          <div className="relative z-1 max-w-md p-8 md:p-12 text-white">
            <p className="page-kicker text-white/70">The Delulu promise</p>
            <p className="font-display text-2xl md:text-4xl font-semibold tracking-tight mt-3">Come as you are. Leave with a story.</p>
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="waitlist-band">
          <div>
            <p className="page-kicker text-ink/60">03 / Delhi NCR and beyond</p>
            <h2 className="mt-4">Not in Delhi NCR <span className="editorial-serif">yet?</span></h2>
            <p>We’re starting across Delhi, Gurugram and Noida. Tell us where you are and we’ll ping you when Delulu lands nearby.</p>
          </div>
          {waitlistDone ? (
            <div className="rounded-2xl bg-ink/10 p-5 text-sm font-semibold">You’re on the list. We’ll be in touch.</div>
          ) : (
            <div>
              <div className="waitlist-form">
                <input value={waitlistCity} onChange={(e) => setWaitlistCity(e.target.value)} placeholder="Delhi / Gurugram / Noida" className="input" aria-label="Your city" />
                <button onClick={joinWaitlist} className="primary-button">Join waitlist <ArrowUpRight size={16} /></button>
              </div>
              {waitlistError && <p className="text-punch text-xs mt-3">{waitlistError}</p>}
            </div>
          )}
        </div>
      </section>

      <section className="story-section">
        <div className="faq-grid">
          <div>
            <p className="page-kicker">04 / FAQ</p>
            <h2 className="mt-5">Good questions are a <span className="editorial-serif">green flag.</span></h2>
          </div>
          <div className="faq-list">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div><span className="font-semibold text-fg">delulu</span><span className="ml-3">show up anyway.</span></div>
        <div className="landing-footer-links">
          {['safety', 'terms', 'privacy', 'refunds', 'hosts'].map((page) => <a key={page} href={`/legal/${page}`}>{page}</a>)}
          <span className="inline-flex items-center gap-1"><MapPin size={12} /> Delhi NCR & beyond</span>
        </div>
      </footer>
    </div>
  )
}
