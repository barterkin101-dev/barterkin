'use client'

import { useActionState, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { sendMagicLink, type SendMagicLinkResult } from '@/lib/actions/auth'

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email.'),
})

type LoginValues = z.infer<typeof LoginSchema>

export function LoginForm({ captchaToken }: { captchaToken: string | null }) {
  const [state, formAction, pending] = useActionState<SendMagicLinkResult | null, FormData>(
    sendMagicLink,
    null,
  )
  const [submittedEmail, setSubmittedEmail] = useState<string>('')

  const form = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '' },
  })

  // Hydrate email from ?email= query param (used by ResendLinkButton on /verify-pending).
  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get('email')
    if (prefill) form.setValue('email', prefill)
  }, [form])

  // Success confirmation state — inline replacement of the form.
  if (state?.ok) {
    return (
      <div className="space-y-4" role="status">
        <h2 className="font-serif text-2xl font-bold leading-[1.2]">Check your email</h2>
        <p className="text-base leading-[1.5]">
          We sent a magic link to {submittedEmail || 'your inbox'}. Click the link to sign in — it expires in 1 hour.
        </p>
        <p className="text-sm text-muted-foreground">
          Don&apos;t see it? Check your spam folder or refresh the page to send another link.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        action={(formData: FormData) => {
          setSubmittedEmail(String(formData.get('email') ?? ''))
          formAction(formData)
        }}
        className="space-y-4"
      >
        {state && !state.ok && state.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <input type="hidden" name="cf-turnstile-response" value={captchaToken ?? ''} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || !captchaToken}
        >
          {pending ? 'Sending…' : 'Send magic link'}
        </Button>
      </form>
    </Form>
  )
}
