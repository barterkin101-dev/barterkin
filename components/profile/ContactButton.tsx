'use client'
import { useState } from 'react'
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
import { ContactForm } from './ContactForm'
import { ContactSuccessState } from './ContactSuccessState'

interface ContactButtonProps {
  recipientProfileId: string
  recipientDisplayName: string
  /** Whether the recipient has accepting_contact=true. Drives CTA slot rendering. */
  recipientAcceptingContact: boolean
}

export function ContactButton({
  recipientProfileId,
  recipientDisplayName,
  recipientAcceptingContact,
}: ContactButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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

  function handleOpenChange(next: boolean) {
    setIsOpen(next)
    // Reset success state when Sheet closes so reopening shows fresh form
    if (!next) setShowSuccess(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {/* UI-SPEC ruling: bg-forest (NOT clay) for the contact trigger */}
        <Button className="h-11 w-full sm:w-auto bg-forest hover:bg-forest-deep text-sage-bg">
          Contact {recipientDisplayName}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="font-serif text-xl text-forest-deep">
            Send {recipientDisplayName} a message
          </SheetTitle>
          <SheetDescription className="text-sm text-forest-mid">
            They&apos;ll reply directly to the email on your account. Barterkin doesn&apos;t
            share your email address until you hear back.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 pb-6 pt-2">
          {showSuccess ? (
            <ContactSuccessState
              recipientDisplayName={recipientDisplayName}
              onClose={() => setIsOpen(false)}
            />
          ) : (
            <ContactForm
              recipientProfileId={recipientProfileId}
              recipientDisplayName={recipientDisplayName}
              onSuccess={() => setShowSuccess(true)}
              onCancel={() => setIsOpen(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
