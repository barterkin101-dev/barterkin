'use client'
import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { createConversation } from '@/lib/actions/messaging'
import type { CreateConversationResult } from '@/lib/actions/messaging.types'
import { captureClientEvent } from '@/lib/analytics-client'
import { ContactLimitUpsellModal } from '@/components/messaging/ContactLimitUpsellModal'

interface MessageButtonProps {
  recipientProfileId: string
  recipientDisplayName: string
  /** Whether the recipient has accepting_contact=true. Drives CTA slot rendering. */
  recipientAcceptingContact: boolean
  listingId?: string
}

export function MessageButton({
  recipientProfileId,
  recipientDisplayName,
  recipientAcceptingContact,
  listingId,
}: MessageButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  const [upsellProps, setUpsellProps] = useState<{
    used: number
    limit: number
    premiumMonthlyPrice: string
    premiumAnnualSavings: string
    premiumContactLimit: number
  } | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const [state, formAction, pending] = useActionState<CreateConversationResult | null, FormData>(
    createConversation,
    null,
  )

  // UI-SPEC §Accepting-contact disabled: show muted Alert, no Sheet at all
  if (!recipientAcceptingContact) {
    return (
      <Alert className="bg-sage-pale border-sage-light">
        <AlertDescription className="text-forest-mid text-sm">
          Not accepting messages right now.
        </AlertDescription>
      </Alert>
    )
  }

  // Handle contact limit reached error → show upsell modal
  useEffect(() => {
    if (state && !state.ok && state.error === 'contact_limit_reached' && state.fieldErrors?._upsell) {
      try {
        const upsellRaw = state.fieldErrors._upsell
        const upsell = JSON.parse(Array.isArray(upsellRaw) ? upsellRaw[0] : upsellRaw)
        setUpsellProps(upsell)
        setShowUpsell(true)
        setIsOpen(false)
        captureClientEvent('contact_limit_upsell_shown', {
          used: upsell.used,
          limit: upsell.limit,
          premium_monthly_price: upsell.premiumMonthlyPrice,
        })
      } catch {
        // Ignore parse errors
      }
    }
  }, [state])

  // On success, navigate to the new conversation thread
  if (state?.ok && state.conversationId) {
    const searchParams = new URLSearchParams()

    if (state.postContactUpgradeNudge) {
      searchParams.set('contactUpgrade', '1')
      searchParams.set('contactUsed', String(state.postContactUpgradeNudge.used))
      searchParams.set('contactLimit', String(state.postContactUpgradeNudge.limit))
      searchParams.set('contactRemaining', String(state.postContactUpgradeNudge.remaining))
      searchParams.set('premiumMonthlyPrice', state.postContactUpgradeNudge.premiumMonthlyPrice)
      searchParams.set('premiumAnnualSavings', state.postContactUpgradeNudge.premiumAnnualSavings)
      searchParams.set('premiumContactLimit', String(state.postContactUpgradeNudge.premiumContactLimit))
    }

    const query = searchParams.toString()
    router.push(`/dashboard/messages/${state.conversationId}${query ? `?${query}` : ''}`)
    return null
  }

  function handleOpenChange(next: boolean) {
    setIsOpen(next)
    if (!next) setMessage('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('recipientProfileId', recipientProfileId)
    if (listingId) fd.set('listingId', listingId)
    fd.set('initialMessage', message.trim())
    formAction(fd)
  }

  const firstName = recipientDisplayName.split(/\s+/)[0] ?? recipientDisplayName
  const counterColor =
    message.length < 20 || message.length > 2000
      ? 'text-destructive'
      : 'text-forest-mid'

  return (
    <>
      <ContactLimitUpsellModal
        open={showUpsell}
        onOpenChange={setShowUpsell}
        used={upsellProps?.used ?? 0}
        limit={upsellProps?.limit ?? 10}
        premiumMonthlyPrice={upsellProps?.premiumMonthlyPrice ?? '$9'}
        premiumAnnualSavings={upsellProps?.premiumAnnualSavings ?? '$18'}
        premiumContactLimit={upsellProps?.premiumContactLimit ?? 100}
      />
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="h-11 w-full sm:w-auto bg-forest hover:bg-forest-deep text-sage-bg">
          Message {recipientDisplayName}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="font-serif text-xl text-forest-deep">
            Message {recipientDisplayName}
          </SheetTitle>
          <SheetDescription className="text-sm text-forest-mid">
            Start a conversation. You&apos;ll be able to keep chatting right here in Barterkin.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="initialMessage">
              Your message
            </label>
            <Textarea
              id="initialMessage"
              name="initialMessage"
              rows={6}
              placeholder={`Hi ${firstName}, I saw your profile and I'd like to trade {skill}. I can offer {counter-skill}. When are you available to connect?`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              disabled={pending}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  const form = e.currentTarget.form
                  if (form) form.requestSubmit()
                }
              }}
            />
            <p className={`text-sm ${counterColor}`}>
              {message.length} / 2000
            </p>
          </div>

          {state && !state.ok && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || message.trim().length < 1}
              className="h-11 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg"
            >
              {pending ? 'Sending…' : 'Send message'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
    </>
  )
}
