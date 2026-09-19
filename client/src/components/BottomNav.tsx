import { Link, useLocation } from 'wouter'
import { CalendarHeart, MessageCircle, PartyPopper, UserRound } from 'lucide-react'

const TABS = [
  { path: '/plans', label: 'Plans', icon: CalendarHeart },
  { path: '/chats', label: 'Chats', icon: MessageCircle },
  { path: '/events', label: 'Events', icon: PartyPopper },
  { path: '/me', label: 'Me', icon: UserRound },
]

export function BottomNav() {
  const [location] = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40">
      <div className="mx-3 mb-3 flex items-center justify-around rounded-2xl border border-border bg-surface/95 backdrop-blur px-2 py-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]">
        {TABS.map((tab) => {
          const active = location.startsWith(tab.path)
          const Icon = tab.icon
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                active ? 'text-ink bg-lime' : 'text-muted'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
