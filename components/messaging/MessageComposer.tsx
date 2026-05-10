'use client'

import { useActionState } from 'react'
import { sendMessage } from '@/lib/actions/messaging'
import type { SendMessageResult } from '@/lib/actions/messaging.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [, sendAction, isPending] = useActionState<SendMessageResult | null, FormData>(
    sendMessage,
    null,
  )

  return (
    <form action={sendAction} className="flex items-end gap-2 border-t p-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      <Textarea
        name="content"
        placeholder="Type a message..."
        className="min-h-[60px] resize-none"
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const form = e.currentTarget.form
            if (form) form.requestSubmit()
          }
        }}
      />
      <Button type="submit" size="icon" disabled={isPending} className="h-10 w-10 shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
