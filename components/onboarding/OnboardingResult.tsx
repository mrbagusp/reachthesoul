'use client'

import React from 'react'
import { CheckCircle, ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/lib/onboarding'
import type { Lang } from './translations'
import { tr } from './translations'

interface OnboardingResultProps {
  recommendation: Recommendation
  lang: Lang
  onExplore: () => void
  onUpgrade: () => void
  onContact: () => void
}

export default function OnboardingResult({ recommendation, lang, onExplore, onUpgrade, onContact }: OnboardingResultProps) {
  const { plan, planLabel, price, reasons, cta, isHotLead } = recommendation

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    starter: 'bg-blue-100 text-blue-700',
    growth: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
          <Sparkles className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{tr('resultTitle', lang)}</h2>
      </div>

      {/* Plan Card */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${planColors[plan] || planColors.free}`}>
            {planLabel[lang]}
          </span>
          <span className="text-2xl font-bold text-gray-900">{price}</span>
        </div>

        {/* Reasons */}
        <div className="space-y-3">
          {reasons.map((reason, i) => (
            <div key={i} className="flex gap-2.5">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 leading-relaxed">{reason[lang]}</p>
            </div>
          ))}
        </div>

        {/* Founding Church note */}
        {plan !== 'free' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">{tr('foundingNote', lang)}</p>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="space-y-2.5">
        {cta === 'explore' && (
          <Button onClick={onExplore} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {tr('exploreDashboard', lang)} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {cta === 'upgrade' && (
          <>
            <Button onClick={onUpgrade} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {tr('upgradeTo', lang)} {planLabel[lang]} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button onClick={onExplore} variant="outline" className="w-full">
              {tr('exploreDashboard', lang)}
            </Button>
          </>
        )}

        {cta === 'contact' && (
          <>
            <Button onClick={onContact} className="w-full bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="w-4 h-4 mr-2" /> {tr('contactTeam', lang)}
            </Button>
            <Button onClick={onExplore} variant="outline" className="w-full">
              {tr('exploreDashboard', lang)}
            </Button>
          </>
        )}

        {cta === 'demo' && (
          <>
            <Button onClick={onContact} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {tr('scheduleDemo', lang)} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button onClick={onExplore} variant="outline" className="w-full">
              {tr('exploreDashboard', lang)}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
