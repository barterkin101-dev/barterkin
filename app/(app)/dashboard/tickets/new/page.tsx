'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTicket } from '@/lib/actions/tickets'
import type { CreateTicketResult } from '@/lib/actions/tickets.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function NewTicketPage() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<CreateTicketResult | null, FormData>(
    createTicket,
    null,
  )

  useEffect(() => {
    if (state?.ok) {
      toast('Ticket created.')
      router.push('/dashboard/tickets')
    } else if (state && !state.ok) {
      toast.error(state.error ?? "Couldn't create ticket.")
    }
  }, [state, router])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
        New Support Ticket
      </h1>

      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" placeholder="Brief description of the issue" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue="bug">
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="normal">
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Please describe the issue in detail..."
            className="min-h-[150px]"
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create Ticket'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/tickets')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
