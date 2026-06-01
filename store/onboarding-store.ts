import { create } from 'zustand'
import type { OrgType, MonthlyVolume, Channel, PainPoint, TeamSize, Urgency } from '@/lib/onboarding'

interface OnboardingState {
  // Quiz state
  step: number // 0 = welcome, 1-6 = questions, 7 = result
  orgType: OrgType | null
  monthlyVolume: MonthlyVolume | null
  channels: Channel[]
  painPoint: PainPoint | null
  teamSize: TeamSize | null
  urgency: Urgency | null

  // UI state
  isOpen: boolean
  isLoading: boolean

  // Actions
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setOrgType: (v: OrgType) => void
  setMonthlyVolume: (v: MonthlyVolume) => void
  toggleChannel: (v: Channel) => void
  setPainPoint: (v: PainPoint) => void
  setTeamSize: (v: TeamSize) => void
  setUrgency: (v: Urgency) => void
  setIsOpen: (v: boolean) => void
  setIsLoading: (v: boolean) => void
  reset: () => void
}

const initialState = {
  step: 0,
  orgType: null,
  monthlyVolume: null,
  channels: [] as Channel[],
  painPoint: null,
  teamSize: null,
  urgency: null,
  isOpen: false,
  isLoading: false,
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  nextStep: () => set({ step: get().step + 1 }),
  prevStep: () => set({ step: Math.max(0, get().step - 1) }),

  setOrgType: (v) => set({ orgType: v }),
  setMonthlyVolume: (v) => set({ monthlyVolume: v }),

  toggleChannel: (v) => {
    const current = get().channels
    if (v === 'none') {
      set({ channels: current.includes('none') ? [] : ['none'] })
      return
    }
    const without = current.filter(c => c !== 'none')
    set({
      channels: without.includes(v)
        ? without.filter(c => c !== v)
        : [...without, v],
    })
  },

  setPainPoint: (v) => set({ painPoint: v }),
  setTeamSize: (v) => set({ teamSize: v }),
  setUrgency: (v) => set({ urgency: v }),
  setIsOpen: (v) => set({ isOpen: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  reset: () => set(initialState),
}))
