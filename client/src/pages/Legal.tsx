import { useParams, Link } from 'wouter'

const PAGES: Record<string, { title: string; body: string[] }> = {
  safety: {
    title: 'Safety',
    body: [
      'Every Delulu account is phone-verified before it can book a table.',
      'All meetups happen at public venues — partner cafes or published event locations. We never facilitate private-address meetups.',
      'You stay an avatar and username until 2 hours before your meetup, when first names unlock for your group only.',
      'Your phone number, email, and exact address are never shown to other members, in chat or anywhere else.',
      'After your meetup, we check in and give you a one-tap way to flag "Need help," which alerts our safety team and surfaces India\'s emergency number, 112.',
      'No-shows confirmed by at least two group members result in a strike. Repeated strikes lead to suspension, then a permanent ban.',
      'This is a working prototype. Some flows (like live SMS or a 24/7 safety team) are simulated for demo purposes.',
    ],
  },
  terms: {
    title: 'Terms',
    body: [
      'Delulu is an 18+ product. We verify age at profile setup and will not create an account for anyone under 18.',
      'Bookings are for a specific date, time window, and group size preference. Actual group composition is determined by our matching system.',
      'Abusive behavior, harassment, or attempts to circumvent anonymity protections may result in suspension or a permanent ban without refund.',
      'This is a prototype build. Terms here are illustrative and not a substitute for a reviewed legal agreement.',
    ],
  },
  privacy: {
    title: 'Privacy',
    body: [
      'We collect your phone number, email, date of birth, pincode, and gender to run matching and verify eligibility.',
      'Your quiz answers and derived trait vector are used only for compatibility scoring — never shown to other users directly.',
      'Other members only ever see your username, avatar, and (after reveal) first name. Your phone, email, and exact address are never exposed.',
      'This is a prototype build; production data handling would be governed by a reviewed privacy policy and applicable law (e.g. India\'s DPDP Act).',
    ],
  },
  refunds: {
    title: 'Refunds',
    body: [
      'Cafe tables: if we can’t match you into a group, you get a full refund of your ₹49 automatically.',
      'Cancel a confirmed cafe table more than 24 hours before the meetup: full refund to credits, no penalty.',
      'Cancel less than 24 hours before: no refund, but no strike either.',
      'Events follow the same 24-hour window but refunds are credited up to 50% depending on the host’s policy, shown on the event page.',
      'Credits can be used toward any future Delulu booking.',
    ],
  },
  hosts: {
    title: 'For Hosts',
    body: [
      'Partner hosts run curated events on Delulu and keep the majority of ticket revenue after Delulu’s commission.',
      'Apply from the Host tab with your concept, past events, and UPI ID. Our team reviews and approves applications.',
      'Once approved, you can publish events, set capacity and pricing, and check attendees in with a 6-digit code on the day.',
      'Payouts are generated after your event completes and are settled manually via UPI in this prototype.',
    ],
  },
}

export default function Legal() {
  const { page } = useParams()
  const content = page ? PAGES[page] : undefined

  if (!content) {
    return (
      <div className="app-shell page-detail px-6 pt-14 pb-10 min-h-screen">
        <p className="text-sm text-muted">Page not found.</p>
        <Link href="/" className="text-sm text-lilac underline mt-4 inline-block">Back home</Link>
      </div>
    )
  }

  return (
    <div className="app-shell page-detail px-6 pt-14 pb-10 min-h-screen">
      <Link href="/" className="text-xs text-muted mb-4 inline-block">← Back</Link>
      <h1 className="font-display text-2xl font-semibold mb-6">{content.title}</h1>
      <div className="space-y-4">
        {content.body.map((p, i) => (
          <p key={i} className="text-sm text-muted leading-relaxed">{p}</p>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap mt-10 pt-6 border-t border-border">
        {Object.keys(PAGES).map((k) => (
          <Link key={k} href={`/legal/${k}`} className="text-xs text-lilac underline capitalize">
            {k}
          </Link>
        ))}
      </div>
    </div>
  )
}
