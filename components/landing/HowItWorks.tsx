import { Card } from '@/components/ui/card'

interface Step {
  number: number
  heading: string
  body: string
}

const STEPS: Step[] = [
  {
    number: 1,
    heading: 'List what you offer',
    body: "Tell us your county, your skills, and what you're looking for. Pick a primary category from the ten Georgia makers already use.",
  },
  {
    number: 2,
    heading: 'Browse your neighbors',
    body: 'Filter by county and category. Read profiles. Find the plumber in Dallas, the cook in Carrollton, the braider in South Fulton.',
  },
  {
    number: 3,
    heading: 'Reach out and trade',
    body: 'Send a message through Barterkin. Replies go straight to your email — we stay out of the way after the first hello.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="bg-sage-bg py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.15em] font-bold text-forest-mid">
            How it works
          </p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
            Three steps to your first trade
          </h2>
          <p className="mt-4 text-base text-forest-deep leading-[1.5]">
            No fees. No middlemen. No app to download. Just Georgians helping Georgians.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {STEPS.map((step) => (
            <Card
              key={step.number}
              className="bg-sage-pale rounded-lg p-8 text-center ring-1 ring-sage-light border-0"
            >
              <div
                className="w-12 h-12 rounded-full bg-forest text-sage-bg font-serif text-xl flex items-center justify-center mx-auto mb-5"
                aria-hidden="true"
              >
                {step.number}
              </div>
              <h3 className="font-serif text-xl font-bold text-forest-deep">
                {step.heading}
              </h3>
              <p className="mt-3 text-sm text-forest-deep leading-[1.5]">
                {step.body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
