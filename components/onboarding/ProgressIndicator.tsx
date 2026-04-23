'use client'
import { cn } from '@/lib/utils'

export function ProgressIndicator({
  currentStep,
  totalSteps = 3,
}: {
  currentStep: number
  totalSteps?: number
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label="Onboarding progress"
      className="flex items-center gap-2"
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isActive = stepNum === currentStep
        return (
          <span
            key={stepNum}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              isCompleted && 'bg-forest-mid',
              isActive && 'bg-clay',
              !isCompleted && !isActive && 'bg-sage-light',
            )}
          />
        )
      })}
      <span className="ml-2 text-xs font-bold uppercase tracking-[0.18em] text-forest-mid">
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  )
}
