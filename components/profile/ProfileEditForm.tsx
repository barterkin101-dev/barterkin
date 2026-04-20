'use client'
import { useActionState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { saveProfile } from '@/lib/actions/profile'
import type { SaveProfileResult, ProfileWithRelations } from '@/lib/actions/profile.types'
import { ProfileFormSchema, type ProfileFormValues } from '@/lib/schemas/profile'
import { SkillRowList } from '@/components/profile/SkillRowList'
import { CountyCombobox } from '@/components/profile/CountyCombobox'
import { CategoryPicker } from '@/components/profile/CategoryPicker'
import { AvatarUploader } from '@/components/profile/AvatarUploader'

export function ProfileEditForm({
  userId,
  defaultValues,
}: {
  userId: string
  defaultValues: ProfileWithRelations | null
}) {
  const [state, formAction, pending] = useActionState<SaveProfileResult | null, FormData>(
    saveProfile,
    null,
  )

  const form = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ProfileFormSchema) as any,
    defaultValues: {
      displayName: defaultValues?.display_name ?? '',
      bio: defaultValues?.bio ?? '',
      avatarUrl: defaultValues?.avatar_url ?? '',
      skillsOffered: defaultValues?.skills_offered?.map((s) => s.skill_text) ?? [''],
      skillsWanted: defaultValues?.skills_wanted?.map((s) => s.skill_text) ?? [],
      countyId: defaultValues?.county_id ?? null,   // FIPS value; matches profiles.county_id because counties.id = FIPS (Plan 02)
      categoryId: defaultValues?.category_id ?? null,
      availability: defaultValues?.availability ?? '',
      acceptingContact: defaultValues?.accepting_contact ?? true,
      tiktokHandle: defaultValues?.tiktok_handle ?? '',
    },
  })

  // D-04: stay on page, toast success
  useEffect(() => {
    if (state?.ok) toast('Profile saved.')
    else if (state && state.ok === false && !state.fieldErrors) {
      toast.error(state.error ?? "Couldn't save your profile. Please try again in a moment.")
    }
  }, [state])

  // Map server fieldErrors to RHF field errors
  useEffect(() => {
    if (state && !state.ok && state.fieldErrors) {
      const msgs = state.fieldErrors
      for (const [key, errors] of Object.entries(msgs)) {
        if (errors && errors.length > 0) {
          form.setError(key as keyof ProfileFormValues, { message: errors[0] })
        }
      }
    }
  }, [state, form])

  // Client->server: serialize skills arrays as JSON strings per Plan 03 FormData contract
  function onSubmit(values: ProfileFormValues) {
    const fd = new FormData()
    fd.set('displayName', values.displayName)
    fd.set('bio', values.bio ?? '')
    fd.set('avatarUrl', values.avatarUrl ?? '')
    fd.set('skillsOffered', JSON.stringify(values.skillsOffered))
    fd.set('skillsWanted', JSON.stringify(values.skillsWanted))
    fd.set('countyId', values.countyId == null ? '' : String(values.countyId))  // FIPS string on the wire, same int on every hop
    fd.set('categoryId', values.categoryId == null ? '' : String(values.categoryId))
    fd.set('availability', values.availability ?? '')
    fd.set('acceptingContact', values.acceptingContact ? 'true' : 'false')
    fd.set('tiktokHandle', values.tiktokHandle ?? '')
    formAction(fd)
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <header className="space-y-2">
            <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">Your profile</h1>
            <p className="text-base text-muted-foreground">Tell the Georgia community who you are and what you can trade.</p>
          </header>

          {state && !state.ok && state.error && !state.fieldErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Section 1: Basic info */}
          <section className="space-y-6">
            <h2 className="font-serif text-2xl font-bold leading-[1.2]">Basic info</h2>

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Kerry Smith" {...field} />
                  </FormControl>
                  <FormDescription>How other Georgians will see you. 1-60 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short paragraph about you, your craft, and what you're hoping to trade."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional. Up to 500 characters. {(field.value ?? '').length}/500</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="avatarUrl"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile photo</FormLabel>
                  <AvatarUploader
                    userId={userId}
                    value={field.value || null}
                    onChange={(url) => field.onChange(url ?? '')}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Section 2: Skills I offer */}
          <section className="space-y-6">
            <h2 className="font-serif text-2xl font-bold leading-[1.2]">Skills I offer</h2>
            <SkillRowList
              fieldName="skillsOffered"
              placeholder="e.g. Woodworking"
              groupHelp="List up to 5 skills you can trade. At least one is required to publish your profile."
            />
          </section>

          {/* Section 3: Skills I want */}
          <section className="space-y-6">
            <h2 className="font-serif text-2xl font-bold leading-[1.2]">Skills I want</h2>
            <SkillRowList
              fieldName="skillsWanted"
              placeholder="e.g. Vegetable gardening"
              groupHelp="List up to 5 skills you'd like to learn or receive. Optional."
            />
          </section>

          {/* Section 4: Location & category */}
          <section className="space-y-6">
            <h2 className="font-serif text-2xl font-bold leading-[1.2]">Location & category</h2>

            <Controller
              name="countyId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County</FormLabel>
                  <CountyCombobox value={field.value} onChange={field.onChange} />
                  <FormDescription>
                    The Georgia county where you live. This shapes who finds you in the directory.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="categoryId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary category</FormLabel>
                  <CategoryPicker value={field.value} onChange={field.onChange} />
                  <FormDescription>Pick the category that best fits what you offer.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Availability</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Weekday evenings and most Saturdays"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Free text. Up to 200 characters. {(field.value ?? '').length}/200
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Section 5: Preferences */}
          <section className="space-y-6">
            <h2 className="font-serif text-2xl font-bold leading-[1.2]">Preferences</h2>

            <Controller
              name="acceptingContact"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Accept new contact requests"
                  />
                  <div className="space-y-1">
                    <FormLabel>Accept new contact requests</FormLabel>
                    <FormDescription>
                      When off, members won&rsquo;t be able to message you through Barterkin. Your profile stays visible in the directory.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tiktokHandle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TikTok handle</FormLabel>
                  <FormControl>
                    <Input placeholder="@yourhandle" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional. Include the @. We&apos;ll link to tiktok.com/@&#123;handle&#125; from your profile.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={pending} className="min-w-[160px]">
              {pending ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}
