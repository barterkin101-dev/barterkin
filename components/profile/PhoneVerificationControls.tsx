'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneVerifiedBadge } from '@/components/profile/PhoneVerifiedBadge'
import {
  sendPhoneVerificationCode,
  verifyPhoneVerificationCode,
} from '@/lib/actions/phone-verification'
import type { PhoneVerificationResult } from '@/lib/actions/profile.types'

interface PhoneVerificationControlsProps {
  phoneNumber: string
  initiallyVerified: boolean
}

export function PhoneVerificationControls({
  phoneNumber,
  initiallyVerified,
}: PhoneVerificationControlsProps) {
  const previousPhoneNumberRef = useRef(phoneNumber)
  const [code, setCode] = useState('')
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [isVerified, setIsVerified] = useState(initiallyVerified)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sendState, sendAction, sendPending] = useActionState<PhoneVerificationResult | null, FormData>(
    sendPhoneVerificationCode,
    null,
  )
  const [verifyState, verifyAction, verifyPending] = useActionState<PhoneVerificationResult | null, FormData>(
    verifyPhoneVerificationCode,
    null,
  )

  useEffect(() => {
    setIsVerified(initiallyVerified)
  }, [initiallyVerified])

  useEffect(() => {
    if (!sendState) return
    if (sendState.ok) {
      setIsVerified(false)
      setShowCodeInput(true)
      setSentTo(sendState.maskedPhoneNumber ?? null)
      toast('Verification code sent.')
      return
    }
    toast.error(sendState.error ?? 'Unable to send verification code.')
  }, [sendState])

  useEffect(() => {
    if (!verifyState) return
    if (verifyState.ok) {
      setIsVerified(true)
      setShowCodeInput(false)
      setCode('')
      setSentTo(verifyState.maskedPhoneNumber ?? null)
      toast('Phone number verified.')
      return
    }
    toast.error(verifyState.error ?? 'Unable to verify that code.')
  }, [verifyState])

  useEffect(() => {
    if (previousPhoneNumberRef.current !== phoneNumber) {
      setIsVerified(false)
      setShowCodeInput(false)
      setCode('')
      previousPhoneNumberRef.current = phoneNumber
    }
  }, [phoneNumber])

  const trimmedPhoneNumber = phoneNumber.trim()
  if (!trimmedPhoneNumber) return null

  function requestCode() {
    const fd = new FormData()
    fd.set('phoneNumber', trimmedPhoneNumber)
    sendAction(fd)
  }

  function submitCode() {
    const fd = new FormData()
    fd.set('phoneNumber', trimmedPhoneNumber)
    fd.set('code', code)
    verifyAction(fd)
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">SMS verification</p>
        {isVerified ? <PhoneVerifiedBadge className="text-xs" /> : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isVerified
          ? `Verified for ${sentTo ?? 'this number'}.`
          : 'Verify your number to show a phone-verified trust badge on your profile and listings.'}
      </p>

      {!isVerified ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" onClick={requestCode} disabled={sendPending || verifyPending}>
            {sendPending ? 'Sending code...' : 'Text me a code'}
          </Button>
          {showCodeInput ? (
            <>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter SMS code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="sm:max-w-[180px]"
              />
              <Button type="button" onClick={submitCode} disabled={!code.trim() || verifyPending || sendPending}>
                {verifyPending ? 'Verifying...' : 'Verify code'}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
