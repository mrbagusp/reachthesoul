'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Church, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'
import { useOnboardingStore } from '@/store/onboarding-store'
import { shouldShowOnboarding, saveOnboardingResponse, getRecommendation } from '@/lib/onboarding'
import type { OrgType, MonthlyVolume, Channel, PainPoint, TeamSize, Urgency, OnboardingResponse } from '@/lib/onboarding'
import { detectLanguage, tr } from './translations'
import type { Lang } from './translations'
import QuizStep from './QuizStep'
import OnboardingResult from './OnboardingResult'

const TOTAL_STEPS = 6

export default function OnboardingQuiz() {
  const router = useRouter()
  const [lang] = useState<Lang>(detectLanguage)

  // Auth — use existing RTS auth store
  const currentUser = useAuthStore((s) => s.currentUser)
  const userId = currentUser?.uid

  const {
    step, isOpen, isLoading,
    orgType, monthlyVolume, channels, painPoint, teamSize, urgency,
    setStep, nextStep, prevStep,
    setOrgType, setMonthlyVolume, toggleChannel, setPainPoint, setTeamSize, setUrgency,
    setIsOpen, setIsLoading,
  } = useOnboardingStore()

  // Check if onboarding should show
  useEffect(() => {
    if (!userId) return
    shouldShowOnboarding(userId).then((show) => {
      if (show) {
        setIsOpen(true)
        setStep(0)
      }
    })
  }, [userId, setIsOpen, setStep])

  // Current step can proceed?
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return true // welcome
      case 1: return orgType !== null
      case 2: return monthlyVolume !== null
      case 3: return channels.length > 0
      case 4: return painPoint !== null
      case 5: return teamSize !== null
      case 6: return urgency !== null
      default: return false
    }
  }, [step, orgType, monthlyVolume, channels, painPoint, teamSize, urgency])

  // Build recommendation
  const recommendation = useMemo(() => {
    if (!orgType || !monthlyVolume || !painPoint || !teamSize || !urgency) return null
    return getRecommendation({
      orgType, monthlyVolume, channels, painPoint, teamSize, urgency,
    })
  }, [orgType, monthlyVolume, channels, painPoint, teamSize, urgency])

  // Handle "See Result" / proceed to result
  const handleSeeResult = async () => {
    if (!userId || !recommendation || !orgType || !monthlyVolume || !painPoint || !teamSize || !urgency) return

    setIsLoading(true)
    try {
      const data: OnboardingResponse = { orgType, monthlyVolume, channels, painPoint, teamSize, urgency }
      await saveOnboardingResponse(userId, data, recommendation, lang)
      setStep(7) // show result
    } catch (err) {
      console.error('Failed to save onboarding:', err)
      setStep(7) // show result anyway
    } finally {
      setIsLoading(false)
    }
  }

  // Result actions
  const handleExplore = () => {
    setIsOpen(false)
  }

  const handleUpgrade = () => {
    setIsOpen(false)
    router.push('/dashboard/billing')
  }

  const handleContact = () => {
    window.open('https://wa.me/6285974773341?text=Hi%2C%20saya%20baru%20mendaftar%20di%20ReachTheSoul%20dan%20ingin%20tahu%20lebih%20lanjut', '_blank')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Onboarding Quiz</DialogTitle>

        {/* Progress Bar (only during questions) */}
        {step >= 1 && step <= 6 && (
          <div className="w-full h-1.5 bg-gray-100">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        )}

        <div className="p-6">

          {/* ─── WELCOME SCREEN (step 0) ─── */}
          {step === 0 && (
            <div className="text-center space-y-5 py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl">
                <Church className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{tr('welcome', lang)}</h2>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">{tr('welcomeSub', lang)}</p>
              </div>
              <Button onClick={nextStep} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {tr('letsStart', lang)} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ─── QUESTION 1: Org Type ─── */}
          {step === 1 && (
            <QuizStep
              question={tr('q1', lang)}
              options={[
                { value: 'church', label: tr('q1_church', lang) },
                { value: 'ministry', label: tr('q1_ministry', lang) },
                { value: 'denomination', label: tr('q1_denomination', lang) },
                { value: 'other', label: tr('q1_other', lang) },
              ]}
              selected={orgType}
              onSelect={(v) => setOrgType(v as OrgType)}
            />
          )}

          {/* ─── QUESTION 2: Volume ─── */}
          {step === 2 && (
            <QuizStep
              question={tr('q2', lang)}
              options={[
                { value: 'none', label: tr('q2_none', lang) },
                { value: 'under10', label: tr('q2_under10', lang) },
                { value: '10to100', label: tr('q2_10to100', lang) },
                { value: 'over100', label: tr('q2_over100', lang) },
              ]}
              selected={monthlyVolume}
              onSelect={(v) => setMonthlyVolume(v as MonthlyVolume)}
            />
          )}

          {/* ─── QUESTION 3: Channels (multi-select) ─── */}
          {step === 3 && (
            <QuizStep
              question={tr('q3', lang)}
              subtitle={tr('q3_sub', lang)}
              multiSelect
              options={[
                { value: 'whatsapp', label: tr('q3_whatsapp', lang) },
                { value: 'instagram', label: tr('q3_instagram', lang) },
                { value: 'email', label: tr('q3_email', lang) },
                { value: 'call', label: tr('q3_call', lang) },
                { value: 'website', label: tr('q3_website', lang) },
                { value: 'none', label: tr('q3_none', lang) },
              ]}
              selected={channels}
              onSelect={(v) => toggleChannel(v as Channel)}
            />
          )}

          {/* ─── QUESTION 4: Pain Point ─── */}
          {step === 4 && (
            <QuizStep
              question={tr('q4', lang)}
              options={[
                { value: 'messages_lost', label: tr('q4_lost', lang) },
                { value: 'no_after_hours', label: tr('q4_afterhours', lang) },
                { value: 'notes_scattered', label: tr('q4_scattered', lang) },
                { value: 'no_tracking', label: tr('q4_notracking', lang) },
                { value: 'no_system', label: tr('q4_nosystem', lang) },
              ]}
              selected={painPoint}
              onSelect={(v) => setPainPoint(v as PainPoint)}
            />
          )}

          {/* ─── QUESTION 5: Team Size ─── */}
          {step === 5 && (
            <QuizStep
              question={tr('q5', lang)}
              options={[
                { value: 'solo', label: tr('q5_solo', lang) },
                { value: '2to5', label: tr('q5_2to5', lang) },
                { value: '6to15', label: tr('q5_6to15', lang) },
                { value: 'over15', label: tr('q5_over15', lang) },
              ]}
              selected={teamSize}
              onSelect={(v) => setTeamSize(v as TeamSize)}
            />
          )}

          {/* ─── QUESTION 6: Urgency ─── */}
          {step === 6 && (
            <QuizStep
              question={tr('q6', lang)}
              options={[
                { value: 'explore', label: tr('q6_explore', lang) },
                { value: 'this_week', label: tr('q6_thisweek', lang) },
                { value: 'this_month', label: tr('q6_thismonth', lang) },
                { value: 'asap', label: tr('q6_asap', lang) },
              ]}
              selected={urgency}
              onSelect={(v) => setUrgency(v as Urgency)}
            />
          )}

          {/* ─── RESULT (step 7) ─── */}
          {step === 7 && recommendation && (
            <OnboardingResult
              recommendation={recommendation}
              lang={lang}
              onExplore={handleExplore}
              onUpgrade={handleUpgrade}
              onContact={handleContact}
            />
          )}

          {/* ─── Navigation Buttons (step 1-6) ─── */}
          {step >= 1 && step <= 6 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> {tr('back', lang)}
              </Button>

              <span className="text-xs text-gray-400">
                {step} {tr('stepOf', lang)} {TOTAL_STEPS}
              </span>

              {step < 6 ? (
                <Button
                  size="sm"
                  onClick={nextStep}
                  disabled={!canProceed}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                >
                  {tr('next', lang)} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSeeResult}
                  disabled={!canProceed || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>{tr('seeResult', lang)} <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
