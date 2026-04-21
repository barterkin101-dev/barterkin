'use client'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

interface ContactSuccessStateProps {
  recipientDisplayName: string
  onClose: () => void
}

export function ContactSuccessState({
  recipientDisplayName,
  onClose,
}: ContactSuccessStateProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null)

  // Autofocus Close button on mount (accessibility — focus shift per UI-SPEC)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <CheckCircle2 className="h-12 w-12 text-forest" aria-hidden="true" />
      <h3 className="font-serif text-xl font-bold text-forest-deep">Sent!</h3>
      <p className="text-base leading-relaxed text-forest-deep">
        {recipientDisplayName} will get your message and can reply directly to your email.
        Barterkin is out of the loop from here.
      </p>
      <p className="text-sm text-forest-mid">
        Watch for a reply in the inbox on your account.
      </p>
      <Button
        ref={closeRef}
        variant="outline"
        onClick={onClose}
        className="h-11 mt-2"
      >
        Close
      </Button>
    </div>
  )
}
