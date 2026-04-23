import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { ProfileCompletenessChecklist } from '@/components/profile/ProfileCompletenessChecklist'
import type { ProfileCompletenessInput } from '@/lib/schemas/profile'

export function StepProfile({
  completenessInput,
  profileComplete,
}: {
  completenessInput: ProfileCompletenessInput
  profileComplete: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold leading-tight text-forest-deep sm:text-3xl">
          First, finish your profile.
        </h2>
        <p className="text-base leading-relaxed text-forest-deep">
          Neighbors find you by county, category, and the skills you offer. Fill in these five and you&apos;re on the map.
        </p>
      </div>

      <ProfileCompletenessChecklist {...completenessInput} />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-11">
          <Link href="/profile/edit?returnTo=/onboarding?step=1">
            Edit my profile <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>

        {profileComplete ? (
          <Button asChild className="h-11 bg-clay hover:bg-clay/90 text-sage-bg">
            <Link href="/onboarding?step=2">
              Next: browse the directory <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    disabled
                    aria-disabled="true"
                    className="h-11 bg-clay text-sage-bg opacity-50 cursor-not-allowed"
                  >
                    Next
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Finish all five to continue</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
