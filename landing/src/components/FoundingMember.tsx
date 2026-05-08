import { motion } from 'motion/react'

const CLAY = 'hsl(27 55% 55%)'

export function FoundingMember() {
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        <motion.div
          className="border border-border rounded-2xl p-10 md:p-14 text-center max-w-2xl mx-auto bg-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-4">
            Be a founding member.
          </h2>
          <p className="font-body text-muted-foreground mb-8 max-w-sm mx-auto text-[15px] leading-relaxed">
            Barterkin is brand new. The first members shape everything. Join now and your profile goes at the top of the directory.
          </p>
          <a
            href="https://barterkin.com/signup"
            style={{ background: CLAY }}
            className="inline-block text-white rounded-xl px-8 py-3.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Claim your spot
          </a>
        </motion.div>
      </div>
    </section>
  )
}
