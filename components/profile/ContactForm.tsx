'use client'
import { useActionState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { MessageSchema, type MessageValues } from '@/lib/schemas/contact'
import { sendContactRequest } from '@/lib/actions/contact'
import type { SendContactResult } from '@/lib/actions/contact.types'

interface ContactFormProps {
  recipientProfileId: string
  recipientDisplayName: string
  onSuccess: () => void
  onCancel: () => void
}

/**
 * Maps Edge Function rejection code → inline Alert copy.
 * Strings are verbatim from 05-UI-SPEC.md §Copywriting Contract.
 * 'bad_message' is excluded — it routes to form.setError('message', ...) instead.
 */
function codeToInlineAlert(
  code: SendContactResult['code'],
  name: string,
): { title: string; description: string } | null {
  switch (code) {
    case 'daily_cap':
      return {
        title: "You've reached your daily contact limit.",
        description:
          "You can send more messages tomorrow. Thanks for keeping Barterkin a calm place to trade.",
      }
    case 'weekly_cap':
      return {
        title: "You've reached your weekly contact limit.",
        description: 'You can send more messages next week.',
      }
    case 'pair_cap':
      return {
        title: `You've already contacted ${name} this week.`,
        description: 'Give them a chance to reply. You can try again next week.',
      }
    case 'pair_dup':
      return {
        title: `You've already contacted ${name} today.`,
        description: 'Give them a chance to reply. You can try again tomorrow.',
      }
    case 'not_accepting':
      return {
        title: `${name} isn't accepting messages right now.`,
        description:
          "Try another member — the directory shows who's currently open to contact.",
      }
    case 'recipient_unreachable':
      return {
        title: `${name} isn't reachable.`,
        description: 'Try another profile from the directory.',
      }
    case 'sender_banned':
      return {
        title: 'Your account is suspended.',
        description:
          'Contact support@barterkin.com if you think this is a mistake.',
      }
    case 'sender_blocked':
      return {
        title: `You've blocked ${name}.`,
        description: 'Contact an admin if you want to unblock.',
      }
    case 'send_failed':
    case 'unknown':
      return {
        title: 'Something went wrong sending your message.',
        description:
          'Please try again in a moment. If it keeps happening, let us know at support@barterkin.com.',
      }
    case 'unauthorized':
      return {
        title: 'Please sign in.',
        description: 'Your session may have expired. Sign in to continue.',
      }
    default:
      return null
  }
}

export function ContactForm({
  recipientProfileId,
  recipientDisplayName,
  onSuccess,
  onCancel,
}: ContactFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [state, formAction, pending] = useActionState(sendContactRequest, null as SendContactResult | null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const form = useForm<MessageValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(MessageSchema) as any,
    defaultValues: { recipientProfileId, message: '' },
  })

  const firstName = recipientDisplayName.split(/\s+/)[0] ?? recipientDisplayName

  // Autofocus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Success: notify parent to swap to success state
  useEffect(() => {
    if (state?.ok) onSuccess()
  }, [state, onSuccess])

  // bad_message: route to field-level error (not Alert)
  useEffect(() => {
    if (state && !state.ok && state.code === 'bad_message' && state.error) {
      form.setError('message', { message: state.error })
    }
  }, [state, form])

  function onSubmit(values: MessageValues) {
    const fd = new FormData()
    fd.set('recipientProfileId', values.recipientProfileId)
    fd.set('message', values.message)
    formAction(fd)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      form.handleSubmit(onSubmit)()
    }
  }

  const inlineAlert =
    state && !state.ok && state.code !== 'bad_message'
      ? codeToInlineAlert(state.code, recipientDisplayName)
      : null

  const messageValue = form.watch('message') ?? ''
  const counterColor =
    messageValue.length < 20 || messageValue.length > 500
      ? 'text-destructive'
      : 'text-forest-mid'

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your message</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  ref={(el) => {
                    field.ref(el)
                    textareaRef.current = el
                  }}
                  rows={8}
                  placeholder={`Hi ${firstName}, I saw your profile and I'd like to trade {skill}. I can offer {counter-skill}. When are you available to connect?`}
                  onKeyDown={handleKeyDown}
                  maxLength={500}
                />
              </FormControl>
              <FormDescription className={`text-sm ${counterColor}`}>
                {messageValue.length} / 500
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {inlineAlert && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{inlineAlert.title}</AlertTitle>
            <AlertDescription>{inlineAlert.description}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="h-11 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg"
          >
            {pending ? 'Sending\u2026' : 'Send message'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
