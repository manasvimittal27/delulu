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
    <nav className="mobile-bottom-nav" aria-label="App navigation">
      <div className="mobile-bottom-nav-inner">
        {TABS.map((tab) => {
          const active = location.startsWith(tab.path)
          const Icon = tab.icon
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`mobile-nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
