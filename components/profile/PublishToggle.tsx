'use client'
import { useActionState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { setPublished } from '@/lib/actions/profile'
import type { SetPublishedResult } from '@/lib/actions/profile.types'
import type { ProfileCompletenessInput } from '@/lib/schemas/profile'
import { isProfileComplete } from '@/lib/schemas/profile'
import { ProfileCompletenessChecklist } from '@/components/profile/ProfileCompletenessChecklist'

export function PublishToggle({
  profileId,
  isPublished,
  completeness,
}: {
  profileId: string
  isPublished: boolean
  completeness: ProfileCompletenessInput
}) {
  const [state, formAction, pending] = useActionState<SetPublishedResult | null, FormData>(
    setPublished,
    null,
  )
  const complete = isProfileComplete(completeness)
  const disabled = !complete || pending

  useEffect(() => {
    if (state?.ok) {
      // The action was invoked with `publish` flipped relative to isPublished prop,
      // so post-success the DB state is the opposite of the prior isPublished.
      toast(isPublished ? 'Profile unpublished.' : 'Profile published.')
    } else if (state && state.ok === false && state.error) {
      toast.error(state.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const switchEl = (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="publish" value={isPublished ? 'false' : 'true'} />
      <Switch
        checked={isPublished}
        disabled={disabled}
        aria-label="Published"
        aria-describedby={disabled ? 'publish-gate-reasons' : undefined}
        // submit the enclosing form on toggle click
        onClick={(e) => {
          if (disabled) {
            e.preventDefault()
            return
          }
          ;(e.currentTarget.closest('form') as HTMLFormElement | null)?.requestSubmit()
        }}
      />
    </form>
  )

  return (
    <div className="space-y-2">
      {state && !state.ok && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-3">
        {disabled && !complete ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{switchEl}</span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[300px] bg-sage-pale border-sage-light text-forest-deep"
                id="publish-gate-reasons"
              >
                <ProfileCompletenessChecklist {...completeness} />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          switchEl
        )}
        <div className="space-y-1">
          <span className="text-sm font-medium">Published</span>
          <p className="text-sm text-muted-foreground">
            {isPublished
              ? 'Your profile is live in the directory.'
              : 'Your profile is currently hidden. Turn on to appear in the directory.'}
          </p>
        </div>
      </div>
    </div>
  )
}
