'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { Lightbulb, X, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { submitFeatureRequest } from '@/lib/actions/feature-requests'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'ui', label: 'Design / UI' },
  { value: 'billing', label: 'Billing / Premium' },
  { value: 'messaging', label: 'Messaging' },
  { value: 'listings', label: 'Listings' },
  { value: 'search', label: 'Search / Discovery' },
  { value: 'other', label: 'Other' },
]

export function FeatureRequestButton() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(submitFeatureRequest, null)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-forest-mid hover:bg-sage-light hover:text-forest-deep transition-colors"
        aria-label="Request a feature"
      >
        <Lightbulb className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-clay" />
              Request a feature
            </DialogTitle>
            <DialogDescription>
              Got an idea? Tell us what would make Barterkin better for you.
            </DialogDescription>
          </DialogHeader>

          {state?.ok ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <p className="mt-4 text-lg font-medium text-forest-deep">
                Thanks for the suggestion!
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                We review every request. You&apos;ll see it in the updates when we ship it.
              </p>
              <Button
                onClick={() => setOpen(false)}
                className="mt-6"
                variant="outline"
              >
                Close
              </Button>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <div>
                <label
                  htmlFor="feature-title"
                  className="block text-sm font-medium text-forest-deep"
                >
                  Title
                </label>
                <Input
                  id="feature-title"
                  name="title"
                  placeholder="e.g. Dark mode for the dashboard"
                  required
                  minLength={5}
                  maxLength={120}
                  className="mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="feature-category"
                  className="block text-sm font-medium text-forest-deep"
                >
                  Category
                </label>
                <select
                  id="feature-category"
                  name="category"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="feature-description"
                  className="block text-sm font-medium text-forest-deep"
                >
                  Description
                </label>
                <Textarea
                  id="feature-description"
                  name="description"
                  placeholder="Describe the feature and why it would help you..."
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={4}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Min 20 characters, max 2000.
                </p>
              </div>

              {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit request'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
