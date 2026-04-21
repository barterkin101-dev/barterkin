'use client'
import { useActionState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ReportSchema, type ReportValues } from '@/lib/schemas/contact'
import { reportMember } from '@/lib/actions/contact'
import type { ReportMemberResult } from '@/lib/actions/contact.types'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (b: boolean) => void
  targetProfileId: string
  targetDisplayName: string
}

const REASON_OPTIONS = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'off-topic', label: 'Off-topic' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
] as const

/**
 * Inner component is keyed by `open` to remount when the Dialog reopens,
 * giving a fresh useActionState and fresh form — avoids stale success state.
 */
function ReportDialogInner({
  open,
  onOpenChange,
  targetProfileId,
  targetDisplayName,
}: ReportDialogProps) {
  const [state, formAction, pending] = useActionState(reportMember, null as ReportMemberResult | null)

  const form = useForm<ReportValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ReportSchema) as any,
    defaultValues: { targetProfileId, reason: 'spam', note: '' },
  })

  // Reset form when dialog closes so it's fresh on next open
  useEffect(() => {
    if (!open) {
      form.reset({ targetProfileId, reason: 'spam', note: '' })
    }
  }, [open, form, targetProfileId])

  // Derive submission state from server action result (no separate useState)
  const submitted = state?.ok === true

  function onSubmit(values: ReportValues) {
    const fd = new FormData()
    fd.set('targetProfileId', values.targetProfileId)
    fd.set('reason', values.reason)
    if (values.note) fd.set('note', values.note)
    formAction(fd)
  }

  return (
    <DialogContent className="max-w-lg">
      {submitted ? (
        <>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-forest-deep">
              Report submitted.
            </DialogTitle>
            <DialogDescription>
              We&apos;ll review it within 24 hours. Thanks for helping keep Barterkin safe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-forest-deep">
              Report {targetDisplayName}
            </DialogTitle>
            <DialogDescription>
              Tell us what&apos;s happening. Reports go to Barterkin staff &mdash;{' '}
              {targetDisplayName} is not notified.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {REASON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional details (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        maxLength={500}
                        placeholder="What should we know? (up to 500 characters)"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {state && !state.ok && state.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  className="h-11 bg-clay hover:bg-clay/90 text-sage-bg"
                >
                  {pending ? 'Submitting\u2026' : 'Submit report'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </>
      )}
    </DialogContent>
  )
}

export function ReportDialog(props: ReportDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <ReportDialogInner {...props} />
    </Dialog>
  )
}
