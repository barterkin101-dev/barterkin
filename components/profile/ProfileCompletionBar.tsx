'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ProfileCompletenessInput } from '@/lib/schemas/profile'
import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'

interface Step {
  key: string
  label: string
  weight: number
  test: (input: ProfileCompletenessInput) => boolean
}

const STEPS: Step[] = [
  { key: 'displayName', label: 'Display name', weight: 15, test: (i) => Boolean(i.displayName) },
  { key: 'avatarUrl', label: 'Profile photo', weight: 20, test: (i) => Boolean(i.avatarUrl) },
  { key: 'countyId', label: 'County', weight: 15, test: (i) => typeof i.countyId === 'number' && i.countyId > 0 },
  { key: 'categoryId', label: 'Primary category', weight: 15, test: (i) => typeof i.categoryId === 'number' && i.categoryId > 0 },
  { key: 'skillsOffered', label: 'At least one skill', weight: 20, test: (i) => i.skillsOfferedCount >= 1 },
  { key: 'bio', label: 'Bio', weight: 15, test: (i) => Boolean((i as unknown as Record<string, unknown>).bio) },
]

export function calculateProfileCompletion(input: ProfileCompletenessInput & { bio?: string | null }): number {
  let total = 0
  for (const step of STEPS) {
    if (step.test(input)) {
      total += step.weight
    }
  }
  return total
}

export function ProfileCompletionBar({
  input,
  showSteps = false,
}: {
  input: ProfileCompletenessInput & { bio?: string | null }
  showSteps?: boolean
}) {
  const percent = calculateProfileCompletion(input)
  const isComplete = percent === 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Profile completion</span>
        <span className={cn('text-sm font-semibold', isComplete ? 'text-forest-mid' : 'text-muted-foreground')}>
          {percent}%
        </span>
      </div>
      <Progress value={percent} className="h-2" />
      {isComplete && (
        <p className="flex items-center gap-1.5 text-sm text-forest-mid">
          <CheckCircle2 className="h-4 w-4" />
          Your profile is complete and ready to publish
        </p>
      )}
      {showSteps && !isComplete && (
        <ul className="space-y-2">
          {STEPS.map((step) => {
            const done = step.test(input)
            return (
              <li key={step.key} className="flex items-center gap-2 text-sm">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-forest-mid shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(done ? 'text-forest-mid' : 'text-muted-foreground')}>
                  {step.label}
                </span>
                {!done && step.key !== 'bio' && (
                  <Link
                    href="/profile/edit"
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Add
                  </Link>
                )}
                {!done && step.key === 'bio' && (
                  <Link
                    href="/profile/edit"
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    +{step.weight}%
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
