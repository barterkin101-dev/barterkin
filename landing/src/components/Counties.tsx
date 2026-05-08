import { motion } from 'motion/react'

const COUNTIES = [
  'Appling County', 'Clarke County', 'Cobb County', 'DeKalb County',
  'Fulton County', 'Chatham County', 'Gwinnett County', 'Hall County',
  'Muscogee County', 'Richmond County', 'Bibb County', 'Cherokee County',
]

export function Counties() {
  return (
    <section id="directory" className="py-16 md:py-24">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">

        <div className="text-center mb-10">
          <motion.p
            className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            Where we&apos;re growing
          </motion.p>
          <motion.h2
            className="font-display font-bold text-2xl md:text-3xl text-foreground mb-4"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Counties on the map so far
          </motion.h2>
          <motion.p
            className="font-body text-sm text-muted-foreground max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.16, duration: 0.5 }}
          >
            Barterkin is Georgia-only. Every member lives here. If your county isn&apos;t listed, be the one who puts it there.
          </motion.p>
        </div>

        <motion.div
          className="flex flex-wrap gap-2 justify-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.24, duration: 0.6 }}
        >
          {COUNTIES.map((c) => (
            <span key={c} className="border border-border rounded-full px-4 py-1.5 text-sm font-body text-foreground/65 bg-white">
              {c}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ delay: 0.32, duration: 0.5 }}
        >
          <p className="text-xs text-muted-foreground mb-5 font-body">
            Georgia residents only. We trust the honor system — misuse gets profiles removed.
          </p>
          <a
            href="https://barterkin.com/directory"
            className="inline-block border border-border rounded-full px-6 py-2.5 text-sm font-body text-foreground/60 hover:text-foreground hover:border-foreground/25 transition-colors bg-white"
          >
            See the full directory
          </a>
        </motion.div>

      </div>
    </section>
  )
}
