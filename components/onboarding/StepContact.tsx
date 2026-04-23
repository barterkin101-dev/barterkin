import Link from 'next/link'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { markOnboardingComplete } from '@/lib/actions/onboarding'

/**
 * Step 3 — Contact.
 *
 * D-11: reaching (viewing) Step 3 marks the wizard complete. The server action is called
 * during render — NOT on the "I'm all set" button click. Idempotent at the DB layer
 * (Pitfall 5 mitigation — guarded by .is(null)).
 *
 * Failure mode: silent degradation (RESEARCH Open Question 3). If the write fails,
 * the step still renders; middleware will redirect the user back on next navigation,
 * from which they can dismiss via Skip for now.
 */
export async function StepContact() {
  await markOnboardingComplete()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold leading-tight text-forest-deep sm:text-3xl">
          Finally, say hello.
        </h2>
        <p className="text-base leading-relaxed text-forest-deep">
          Find someone whose skills match yours. Send a short note through Barterkin — their reply lands in your inbox. No fees. No middlemen.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-11">
          <Link href="/directory">
            <MessageSquare className="mr-1 h-4 w-4" aria-hidden="true" /> Find someone to contact <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild className="h-11 bg-clay hover:bg-clay/90 text-sage-bg">
          <Link href="/directory">I&apos;m all set</Link>
        </Button>
      </div>
    </div>
  )
}
