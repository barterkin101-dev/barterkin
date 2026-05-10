'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addTicketMessage } from '@/lib/actions/tickets'
import type { AddTicketMessageResult } from '@/lib/actions/tickets.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<AddTicketMessageResult | null, FormData>(
    addTicketMessage,
    null,
  )

  useEffect(() => {
    if (state?.ok) {
      toast('Reply sent.')
      // Refresh the page to show the new message
      router.refresh()
    } else if (state && !state.ok) {
      toast.error(state.error ?? "Couldn't send reply.")
    }
  }, [state, router])

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Textarea
        name="content"
        placeholder="Add a reply..."
        className="min-h-[80px] resize-none"
        required
        disabled={pending}
      />
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending...' : 'Reply'}
      </Button>
    </form>
  )
}
