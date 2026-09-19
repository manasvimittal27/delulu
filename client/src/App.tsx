import { useEffect, useState } from 'react'
import { Route, Switch, Redirect } from 'wouter'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

import Landing from '@/pages/Landing'
import Join from '@/pages/Join'
import ProfileSetup from '@/pages/onboarding/ProfileSetup'
import Quiz from '@/pages/onboarding/Quiz'
import VibeCard from '@/pages/onboarding/VibeCard'
import AvatarPicker from '@/pages/onboarding/AvatarPicker'
import Plans from '@/pages/Plans'
import Chats from '@/pages/Chats'
import Events from '@/pages/Events'
import Me from '@/pages/Me'
import ChatRoom from '@/pages/ChatRoom'
import Legal from '@/pages/Legal'
import EventDetail from '@/pages/EventDetail'
import HostPortal from '@/pages/HostPortal'
import AdminDashboard from '@/pages/AdminDashboard'
import EmergencyContacts from '@/pages/EmergencyContacts'

function OnboardingGate({ step, children }: { step: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Redirect to="/join" />
  if (user.onboardingStep !== step) return <Redirect to={`/onboarding/${user.onboardingStep}`} />
  return <>{children}</>
}

function RequireDone({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Redirect to="/join" />
  if (user.onboardingStep !== 'done') return <Redirect to={`/onboarding/${user.onboardingStep}`} />
  return <>{children}</>
}

function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api
      .get<{ user: any }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!(e instanceof ApiError)) console.error(e)
      })
      .finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div className="app-shell flex items-center justify-center min-h-screen">
        <p className="text-muted text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/join" component={Join} />
      <Route path="/onboarding/profile">
        <OnboardingGate step="profile">
          <ProfileSetup />
        </OnboardingGate>
      </Route>
      <Route path="/onboarding/quiz">
        <OnboardingGate step="quiz">
          <Quiz />
        </OnboardingGate>
      </Route>
      <Route path="/onboarding/vibe-card">
        <OnboardingGate step="quiz">
          <VibeCard />
        </OnboardingGate>
      </Route>
      <Route path="/onboarding/avatar">
        <OnboardingGate step="avatar">
          <AvatarPicker />
        </OnboardingGate>
      </Route>
      <Route path="/plans">
        <RequireDone>
          <Plans />
        </RequireDone>
      </Route>
      <Route path="/chats">
        <RequireDone>
          <Chats />
        </RequireDone>
      </Route>
      <Route path="/events" component={Events} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/host" component={HostPortal} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/me/emergency-contacts">
        <RequireDone>
          <EmergencyContacts />
        </RequireDone>
      </Route>
      <Route path="/me">
        <RequireDone>
          <Me />
        </RequireDone>
      </Route>
      <Route path="/chat/:groupId">
        <RequireDone>
          <ChatRoom />
        </RequireDone>
      </Route>
      <Route path="/legal/:page" component={Legal} />
      <Route>
        <div className="app-shell flex items-center justify-center min-h-screen">
          <p className="text-muted text-sm">Page not found.</p>
        </div>
      </Route>
    </Switch>
  )
}

export default App
