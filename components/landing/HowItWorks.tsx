import Image from 'next/image'

interface Step {
  number: number
  heading: string
  body: string
  image: string
  imageAlt: string
}

const STEPS: Step[] = [
  {
    number: 1,
    heading: 'List what you offer',
    body: "Tell us your county, your skills, and what you're looking for. Pick a primary category from the ten Georgia makers already use.",
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    imageAlt: 'Person writing their skill profile',
  },
  {
    number: 2,
    heading: 'Browse your neighbors',
    body: 'Filter by county and category. Read profiles. Find the plumber in Dallas, the cook in Carrollton, the braider in South Fulton.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
    imageAlt: 'Neighbors connecting in a community',
  },
  {
    number: 3,
    heading: 'Reach out and trade',
    body: 'Send a message through Barterkin. Replies go straight to your email — we stay out of the way after the first hello.',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&q=80',
    imageAlt: 'Two people completing a handshake trade',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="bg-sage-bg py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
            How it works
          </p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
            Three steps to your first trade
          </h2>
          <p className="mt-4 text-base text-forest-mid leading-relaxed">
            No fees. No middlemen. No app to download. Just Georgians helping Georgians.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="group rounded-2xl overflow-hidden bg-sage-pale ring-1 ring-sage-light hover:ring-forest/20 hover:shadow-lg transition-all duration-300"
            >
              {/* image */}
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={step.image}
                  alt={step.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage-pale via-transparent to-transparent" />
                {/* step number pill */}
                <div className="absolute bottom-3 left-4 w-9 h-9 rounded-full bg-forest text-sage-bg font-serif text-base font-bold flex items-center justify-center shadow-md">
                  {step.number}
                </div>
              </div>

              {/* text */}
              <div className="p-6">
                <h3 className="font-serif text-lg font-bold text-forest-deep">
                  {step.heading}
                </h3>
                <p className="mt-2 text-sm text-forest-mid leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
