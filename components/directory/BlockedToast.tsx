'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface BlockedToastProps {
  blockedName: string | undefined
  errorFlag?: boolean
}

export function BlockedToast({ blockedName, errorFlag }: BlockedToastProps) {
  const firedRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    if (errorFlag) {
      toast.error("Couldn't block that member. Please try again.")
    } else if (blockedName && blockedName.trim().length > 0) {
      toast(`${blockedName} blocked.`, {
        description: "They've been removed from your directory view.",
      })
    } else {
      return
    }

    // M-02 fix: strip the query param so browser back-navigation doesn't re-fire the toast.
    // replace() rewrites the history entry in place; scroll: false avoids jarring scroll-to-top.
    router.replace('/directory', { scroll: false })
  }, [blockedName, errorFlag, router])

  return null
}
