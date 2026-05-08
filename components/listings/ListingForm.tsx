'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { saveListing } from '@/lib/actions/listings'
import type { SaveListingResult } from '@/lib/actions/listings.types'
import { ListingFormSchema, type ListingFormValues } from '@/lib/schemas/listings'
import { ImageUploader } from './ImageUploader'
import type { ListingRow } from '@/lib/data/listings.types'

interface FilterOption {
  id: number
  name: string
}

interface ListingFormProps {
  userId: string
  categories: FilterOption[]
  counties: FilterOption[]
  defaultValues?: ListingRow | null
  returnTo?: string
}

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for-parts', label: 'For Parts' },
]

export function ListingForm({
  userId,
  categories,
  counties,
  defaultValues,
  returnTo,
}: ListingFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<SaveListingResult | null, FormData>(
    saveListing,
    null,
  )

  const form = useForm<ListingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ListingFormSchema) as any,
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      categoryId: defaultValues?.category_id ?? null,
      countyId: defaultValues?.county_id ?? null,
      condition: (defaultValues?.condition as ListingFormValues['condition']) ?? null,
      tradeTerms: defaultValues?.trade_terms ?? '',
      priceEstimate: defaultValues?.price_estimate ?? '',
      images: defaultValues?.images?.map((img) => img.url) ?? [],
    },
  })

  useEffect(() => {
    if (state?.ok) {
      toast('Listing saved.')
      if (returnTo) {
        router.push(returnTo)
      } else {
        router.push('/dashboard/listings')
      }
    } else if (state && state.ok === false && !state.fieldErrors) {
      toast.error(state.error ?? "Couldn't save your listing. Please try again.")
    }
  }, [state, returnTo, router])

  useEffect(() => {
    if (state && !state.ok && state.fieldErrors) {
      const msgs = state.fieldErrors
      for (const [key, errors] of Object.entries(msgs)) {
        if (errors && errors.length > 0) {
          form.setError(key as keyof ListingFormValues, { message: errors[0] })
        }
      }
    }
  }, [state, form])

  function onSubmit(values: ListingFormValues) {
    const fd = new FormData()
    fd.set('title', values.title)
    fd.set('description', values.description)
    fd.set('categoryId', values.categoryId == null ? '' : String(values.categoryId))
    fd.set('countyId', values.countyId == null ? '' : String(values.countyId))
    fd.set('condition', values.condition ?? '')
    fd.set('tradeTerms', values.tradeTerms ?? '')
    fd.set('priceEstimate', values.priceEstimate ?? '')
    fd.set('images', JSON.stringify(values.images))
    if (defaultValues?.id) {
      fd.set('listingId', defaultValues.id)
    }
    formAction(fd)
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <header className="space-y-2">
            <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
              {defaultValues ? 'Edit Listing' : 'Create Listing'}
            </h1>
            <p className="text-base text-muted-foreground">
              Tell the Georgia community what you have to trade.
            </p>
          </header>

          {state && !state.ok && state.error && !state.fieldErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Images */}
          <section className="space-y-3">
            <h2 className="font-serif text-xl font-bold">Photos</h2>
            <Controller
              control={form.control}
              name="images"
              render={({ field }) => (
                <ImageUploader
                  userId={userId}
                  values={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <FormMessage>{form.formState.errors.images?.message}</FormMessage>
          </section>

          {/* Basic Info */}
          <section className="space-y-6">
            <h2 className="font-serif text-xl font-bold">Basic Info</h2>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Handmade sourdough starter + lessons" {...field} />
                  </FormControl>
                  <FormDescription>5–120 characters. Be specific and descriptive.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you're offering, its condition, and what you're looking for in return."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>20–2000 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Details */}
          <section className="space-y-6">
            <h2 className="font-serif text-xl font-bold">Details</h2>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value == null ? '' : String(field.value)}
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>County</FormLabel>
                    <Select
                      value={field.value == null ? '' : String(field.value)}
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a county" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {counties.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(val) => field.onChange(val || null)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {conditions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tradeTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade Terms</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Willing to trade for woodworking tools or fresh eggs"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional. What you&apos;d like in return. Max 200 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priceEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. $50–100 or open to offers"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional. Helps buyers understand the trade value.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : defaultValues ? 'Update Listing' : 'Create Listing'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/dashboard/listings')}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}
