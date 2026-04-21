'use client'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface BlockedToastProps {
  blockedName: string | undefined
  errorFlag?: boolean
}

export function BlockedToast({ blockedName, errorFlag }: BlockedToastProps) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    if (errorFlag) {
      toast.error("Couldn't block that member. Please try again.")
      return
    }

    if (!blockedName || blockedName.trim().length === 0) return

    toast(`${blockedName} blocked.`, {
      description: "They've been removed from your directory view.",
    })
  }, [blockedName, errorFlag])

  return null
}
