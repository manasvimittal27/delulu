import type { ReactNode } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useAuthStore } from '@/lib/store'
import { ThemeToggle } from '@/components/ThemeToggle'

const APP_NAV = [
  { path: '/plans', label: 'Plans' },
  { path: '/chats', label: 'Chats' },
  { path: '/events', label: 'Events' },
  { path: '/me', label: 'Me' },
]

export function BrandMark() {
  return (
    <Link href="/" className="brand-mark" aria-label="Delulu home">
      <span className="brand-mark-icon"><Sparkles size={15} strokeWidth={2.5} /></span>
      <span>delulu</span>
    </Link>
  )
}

export function AppFrame({ children }: { children: ReactNode }) {
  const [location] = useLocation()
  const user = useAuthStore((s) => s.user)
  const onboarding = location.startsWith('/onboarding') || location === '/join'
  const landing = location === '/'
  const active = (path: string) => location === path || location.startsWith(`${path}/`)

  return (
    <div className="site-frame">
      <header className={`site-header ${onboarding ? 'site-header-minimal' : ''}`}>
        <div className="site-header-inner">
          <BrandMark />
          {!onboarding && (
            <nav className="desktop-nav" aria-label="Primary navigation">
              {landing ? (
                <>
                  <a href="#how-it-works" className="desktop-nav-link">How it works</a>
                  <a href="#tracks" className="desktop-nav-link">Two tracks</a>
                  <Link href="/events" className="desktop-nav-link">Events</Link>
                </>
              ) : (
                APP_NAV.map((item) => (
                  <Link key={item.path} href={item.path} className={`desktop-nav-link ${active(item.path) ? 'active' : ''}`}>
                    {item.label}
                  </Link>
                ))
              )}
            </nav>
          )}
          <div className="site-header-actions">
            <ThemeToggle />
            {!onboarding && (
              user ? (
                <Link href="/plans" className="header-cta">Open Delulu <ArrowUpRight size={14} /></Link>
              ) : (
                <Link href="/join" className="header-cta">Join the table <ArrowUpRight size={14} /></Link>
              )
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
