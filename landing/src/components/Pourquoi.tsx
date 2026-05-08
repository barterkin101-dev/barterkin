import { motion } from 'motion/react'
import { Lock, MapPin, DollarSign, Users } from 'lucide-react'
import { BlurText } from '@/components/BlurText'
import { REASONS } from '@/lib/constants'

const ICONS: Record<string, React.ElementType> = { Lock, MapPin, DollarSign, Users }

export function Pourquoi() {
  return (
    <section id="why" className="relative py-28 md:py-40 border-t border-border/40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        <div className="mb-16 text-center">
          <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-body text-foreground/80">
            Why Barterkin
          </span>
          <BlurText
            text="Built different. On purpose."
            className="mt-4 font-display font-bold uppercase text-4xl md:text-5xl lg:text-6xl leading-[0.9] tracking-tight mx-auto max-w-[20ch]"
            delay={0.08}
            startDelay={0.05}
          />
          <p className="mt-4 font-body text-foreground/60 text-base max-w-xl mx-auto leading-relaxed">
            Every decision we made — from privacy to pricing — was made with Georgia neighbors in mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {REASONS.map((reason, i) => {
            const Icon = ICONS[reason.icon] ?? Users
            return (
              <motion.div
                key={reason.title}
                className="liquid-glass rounded-2xl p-7 flex flex-col gap-5 min-h-[260px]"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="liquid-glass-strong rounded-full w-11 h-11 flex items-center justify-center">
                  <Icon className="size-5 text-foreground" />
                </div>
                <h3 className="font-display font-bold uppercase text-xl tracking-tight">
                  {reason.title}
                </h3>
                <p className="font-body text-sm text-foreground/60 leading-relaxed">
                  {reason.body}
                </p>
                <div className="mt-auto h-px w-10 bg-gradient-to-r from-primary to-transparent" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
