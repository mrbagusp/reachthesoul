'use client'

import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
  icon?: React.ReactNode
}

interface QuizStepProps {
  question: string
  subtitle?: string
  options: Option[]
  selected: string | string[] | null
  onSelect: (value: string) => void
  multiSelect?: boolean
}

export default function QuizStep({ question, subtitle, options, selected, onSelect, multiSelect = false }: QuizStepProps) {
  const isSelected = (value: string) => {
    if (multiSelect && Array.isArray(selected)) return selected.includes(value)
    return selected === value
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 leading-snug">{question}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      <div className="space-y-2.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              'w-full flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-150',
              isSelected(opt.value)
                ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            {/* Checkbox / Radio indicator */}
            <div className={cn(
              'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              multiSelect ? 'rounded-md' : 'rounded-full',
              isSelected(opt.value)
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            )}>
              {isSelected(opt.value) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>

            {/* Icon (optional) */}
            {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}

            {/* Label */}
            <span className="text-sm font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
