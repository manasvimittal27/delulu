import { create } from 'zustand'

export interface SelfUser {
  id: string
  phone: string
  email: string | null
  city: string | null
  gender: string | null
  username: string | null
  avatarId: string | null
  avatarColor: string | null
  onboardingStep: 'profile' | 'quiz' | 'avatar' | 'done'
  reliability: 'excellent' | 'good' | 'shaky'
  strikes: number
  creditsPaise: number
  role: 'user' | 'host' | 'admin'
}

interface AuthState {
  user: SelfUser | null
  setUser: (user: SelfUser | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
