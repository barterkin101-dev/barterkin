'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react'
import { saveProfile } from '@/lib/actions/profile'
import { ProfileFormSchema, type ProfileFormValues } from '@/lib/schemas/profile'
import type { ProfileWithRelations } from '@/lib/actions/profile.types'

interface BioWizardProps {
  userId: string
  profile: ProfileWithRelations | null
}

const prompts = [
  {
    title: 'What are you great at?',
    description: 'Share your craft, trade, or skill. What makes you proud?',
    placeholder: 'I make sourdough bread from a 10-year-old starter and love teaching others...',
  },
  {
    title: 'What are you looking for?',
    description: 'What do you need help with or want to learn?',
    placeholder: 'I am learning woodworking and would love help building raised garden beds...',
  },
  {
    title: 'Tell a story about your best trade',
    description: 'A memorable swap that shows who you are.',
    placeholder: 'Last summer I traded a dozen jars of honey for guitar lessons...',
  },
]

export function BioWizard({ profile }: BioWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState(false)

  const form = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ProfileFormSchema) as any,
    defaultValues: {
      displayName: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
      avatarUrl: profile?.avatar_url ?? '',
      skillsOffered: profile?.skills_offered?.map((s) => s.skill_text) ?? [''],
      skillsWanted: profile?.skills_wanted?.map((s) => s.skill_text) ?? [],
      countyId: profile?.county_id ?? null,
      categoryId: profile?.category_id ?? null,
      availability: profile?.availability ?? '',
      acceptingContact: profile?.accepting_contact ?? true,
      tiktokHandle: profile?.tiktok_handle ?? '',
    },
  })

  const currentPrompt = prompts[step]
  const bioValue = form.watch('bio')
  const isComplete = bioValue && bioValue.trim().length >= 20

  async function onSubmit() {
    setPending(true)
    const values = form.getValues()
    const fd = new FormData()
    fd.set('displayName', values.displayName)
    fd.set('bio', values.bio ?? '')
    fd.set('avatarUrl', values.avatarUrl ?? '')
    fd.set('skillsOffered', JSON.stringify(values.skillsOffered))
    fd.set('skillsWanted', JSON.stringify(values.skillsWanted))
    fd.set('countyId', values.countyId == null ? '' : String(values.countyId))
    fd.set('categoryId', values.categoryId == null ? '' : String(values.categoryId))
    fd.set('availability', values.availability ?? '')
    fd.set('acceptingContact', values.acceptingContact ? 'true' : 'false')
    fd.set('tiktokHandle', values.tiktokHandle ?? '')

    const result = await saveProfile(null, fd)
    setPending(false)

    if (result?.ok) {
      toast('Profile saved!')
      router.push('/dashboard')
    } else if (result?.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
      // Some required fields (e.g. displayName) are missing. Redirect to full editor.
      const missing = Object.keys(result.fieldErrors).join(', ')
      toast.error(`Your profile needs a few more details (${missing}). Opening the full editor...`)
      router.push('/profile/edit?returnTo=%2Fdashboard')
    } else {
      toast.error(result?.error ?? 'Something went wrong.')
    }
  }

  function handlePromptClick(text: string) {
    const currentBio = form.getValues('bio') ?? ''
    const separator = currentBio.length > 0 ? '\n\n' : ''
    form.setValue('bio', currentBio + separator + text, { shouldValidate: true })
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <div className="mx-auto max-w-2xl space-y-8">
          <header className="space-y-2">
            <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
              Complete your bio
            </h1>
            <p className="text-base text-muted-foreground">
              A great bio helps others trust you and improves your visibility in the directory.
            </p>
          </header>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {prompts.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Prompt cards */}
          <div className="grid gap-3">
            {prompts.map((prompt, i) => (
              <Card
                key={i}
                className={`cursor-pointer transition-colors ${
                  step === i ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setStep(i)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      i < step ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : <span className="text-sm">{i + 1}</span>}
                  </div>
                  <div>
                    <p className="font-medium">{prompt.title}</p>
                    <p className="text-sm text-muted-foreground">{prompt.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Active prompt editor */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">{currentPrompt.title}</h2>
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={currentPrompt.placeholder}
                        className="min-h-[160px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <FormMessage />
                      <span className="text-xs text-muted-foreground">
                        {field.value?.length ?? 0} / 500
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-2">
                <p className="w-full text-sm text-muted-foreground">Quick starters:</p>
                {[
                  "I've been doing this for years...",
                  'My favorite thing to trade is...',
                  "I'm always looking for...",
                ].map((starter) => (
                  <Button
                    key={starter}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePromptClick(starter)}
                  >
                    {starter}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < prompts.length - 1 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!isComplete || pending}
              >
                {pending ? 'Saving...' : 'Save Profile'}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Form>
    </FormProvider>
  )
}
