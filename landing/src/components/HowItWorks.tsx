import { motion } from 'motion/react'

const CLAY = 'hsl(27 55% 55%)'

const STEPS = [
  {
    n: '1',
    title: 'List what you offer',
    body: "Tell us your county, your skills, and what you're looking for. Pick a primary category from the ten Georgia makers already use.",
    src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    alt: 'Person writing their skill profile',
  },
  {
    n: '2',
    title: 'Browse your neighbors',
    body: 'Filter by county and category. Read profiles. Find the plumber in Dallas, the cook in Carrollton, the braider in South Fulton.',
    src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
    alt: 'Neighbors connecting in a community',
  },
  {
    n: '3',
    title: 'Reach out and trade',
    body: "Send a message through Barterkin. Replies go straight to your email — we stay out of the way after the first hello.",
    src: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&q=80',
    alt: 'Two people completing a handshake trade',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-36">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">

        {/* Header */}
        <div className="text-center mb-14">
          <motion.p
            className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            How it works
          </motion.p>
          <motion.h2
            className="font-display font-bold text-3xl md:text-4xl lg:text-[2.75rem] text-foreground leading-tight mb-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Three steps to your first trade
          </motion.h2>
          <motion.p
            className="font-body text-muted-foreground max-w-md mx-auto text-[15px]"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.16, duration: 0.6 }}
          >
            No fees. No middlemen. No app to download. Just Georgians helping Georgians.
          </motion.p>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={step.src}
                  alt={step.alt}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-display font-black text-2xl" style={{ color: CLAY }}>{step.n}</span>
                  <h3 className="font-body font-semibold text-foreground">{step.title}</h3>
                </div>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
