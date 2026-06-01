import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ─── Types ──────────────────────────────────────────────

export type OrgType = 'church' | 'ministry' | 'denomination' | 'other'
export type MonthlyVolume = 'none' | 'under10' | '10to100' | 'over100'
export type Channel = 'whatsapp' | 'instagram' | 'email' | 'call' | 'website' | 'none'
export type PainPoint = 'messages_lost' | 'no_after_hours' | 'notes_scattered' | 'no_tracking' | 'no_system'
export type TeamSize = 'solo' | '2to5' | '6to15' | 'over15'
export type Urgency = 'explore' | 'this_week' | 'this_month' | 'asap'
export type RecommendedPlan = 'free' | 'starter' | 'growth' | 'enterprise'

export interface OnboardingResponse {
  orgType: OrgType
  monthlyVolume: MonthlyVolume
  channels: Channel[]
  painPoint: PainPoint
  teamSize: TeamSize
  urgency: Urgency
}

export interface Recommendation {
  plan: RecommendedPlan
  planLabel: { id: string; en: string }
  price: string
  reasons: { id: string; en: string }[]
  cta: 'explore' | 'upgrade' | 'demo' | 'contact'
  isHotLead: boolean
}

// ─── Recommendation Engine ──────────────────────────────

export function getRecommendation(data: OnboardingResponse): Recommendation {
  const { orgType, monthlyVolume, channels, painPoint, teamSize, urgency } = data

  const isHotLead = urgency === 'asap' || monthlyVolume === 'over100'
  const hasWhatsApp = channels.includes('whatsapp')
  const isMultiChannel = channels.filter(c => c !== 'none').length >= 2

  // Enterprise
  if (teamSize === 'over15' || orgType === 'denomination') {
    return {
      plan: 'enterprise',
      planLabel: { id: 'Enterprise', en: 'Enterprise' },
      price: '$249+/mo',
      reasons: [
        {
          id: 'Dengan tim besar dan kebutuhan kompleks, Anda butuh unlimited users, dedicated account manager, dan SLA guarantee.',
          en: 'With a large team and complex needs, you need unlimited users, a dedicated account manager, and SLA guarantee.',
        },
        {
          id: 'Call integration sudah termasuk tanpa biaya setup tambahan.',
          en: 'Call integration is included with no additional setup fee.',
        },
      ],
      cta: 'contact',
      isHotLead: true,
    }
  }

  // Growth
  if (
    monthlyVolume === 'over100' ||
    monthlyVolume === '10to100' && (isMultiChannel || painPoint === 'no_after_hours') ||
    teamSize === '6to15'
  ) {
    return {
      plan: 'growth',
      planLabel: { id: 'Growth', en: 'Growth' },
      price: '$97/mo',
      reasons: [
        {
          id: 'AI crisis detection akan langsung alert tim pastoral via WhatsApp ketika ada pesan darurat, bahkan jam 2 pagi.',
          en: 'AI crisis detection will instantly alert your pastoral team via WhatsApp when there is an urgent message, even at 2 AM.',
        },
        {
          id: 'Omnichannel inbox menyatukan WhatsApp, Instagram, dan Facebook dalam satu dashboard.',
          en: 'Omnichannel inbox unifies WhatsApp, Instagram, and Facebook into one dashboard.',
        },
        {
          id: 'Advanced analytics agar Anda tahu persis berapa yang sudah di-follow up.',
          en: 'Advanced analytics so you know exactly how many have been followed up.',
        },
      ],
      cta: isHotLead ? 'contact' : 'upgrade',
      isHotLead,
    }
  }

  // Starter
  if (
    hasWhatsApp ||
    monthlyVolume === 'under10' && painPoint !== 'no_system' ||
    monthlyVolume === '10to100'
  ) {
    return {
      plan: 'starter',
      planLabel: { id: 'Starter', en: 'Starter' },
      price: '$29/mo',
      reasons: [
        {
          id: 'AI auto-reply akan merespon setiap pesan dalam 1 menit, 24/7. Tidak ada lagi pesan yang tenggelam.',
          en: 'AI auto-reply will respond to every message within 1 minute, 24/7. No more buried messages.',
        },
        ...(hasWhatsApp ? [{
          id: 'WhatsApp integration langsung terhubung. Tim kami bantu setup dalam 12 jam.',
          en: 'WhatsApp integration connects directly. Our team helps set up within 12 hours.',
        }] : []),
        {
          id: 'Semua percakapan tercatat rapi dengan counseling journal dan ticket system.',
          en: 'All conversations are neatly tracked with counseling journal and ticket system.',
        },
      ],
      cta: isHotLead ? 'contact' : 'upgrade',
      isHotLead,
    }
  }

  // Free (default)
  return {
    plan: 'free',
    planLabel: { id: 'Free Plan', en: 'Free Plan' },
    price: '$0',
    reasons: [
      {
        id: 'Explore dashboard dengan demo data yang sudah kami siapkan. Upgrade kapan saja ketika siap.',
        en: 'Explore the dashboard with pre-loaded demo data. Upgrade anytime when you are ready.',
      },
      {
        id: 'Website chat widget sudah bisa dipakai untuk mulai terima pesan dari website Anda.',
        en: 'Website chat widget is ready to use to start receiving messages from your site.',
      },
    ],
    cta: 'explore',
    isHotLead: false,
  }
}

// ─── Firestore Functions ────────────────────────────────

export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return true
    return userDoc.data()?.onboardingComplete !== true
  } catch {
    return true
  }
}

export async function saveOnboardingResponse(
  userId: string,
  data: OnboardingResponse,
  recommendation: Recommendation,
  browserLanguage: string
): Promise<void> {
  // Save onboarding response
  await setDoc(doc(db, 'onboarding_responses', userId), {
    ...data,
    browserLanguage,
    recommendedPlan: recommendation.plan,
    isHotLead: recommendation.isHotLead,
    createdAt: serverTimestamp(),
    convertedAt: null,
  })

  // Mark user as onboarded
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  if (userDoc.exists()) {
    await setDoc(userRef, {
      ...userDoc.data(),
      onboardingComplete: true,
      onboardingCompletedAt: serverTimestamp(),
    }, { merge: true })
  }
}
