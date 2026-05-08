import { motion } from 'motion/react'
import { ArrowUpRight, Layers, ArrowLeftRight, MapPin, ShieldCheck, Tag, Star } from 'lucide-react'
import { BlurText } from '@/components/BlurText'
import { SERVICES } from '@/lib/constants'

const ICONS: Record<string, React.ElementType> = {
  Layers, ArrowLeftRight, MapPin, ShieldCheck, Tag, Star,
}

const CARD_CLASSES = [
  'md:row-span-2 md:col-span-1 p-8 min-h-[480px]',
  'md:col-span-1 p-6 min-h-[228px]',
  'md:col-span-1 p-6 min-h-[228px]',
  'md:col-span-2 p-7 min-h-[228px]',
  'md:col-span-1 p-6 min-h-[228px]',
  'md:col-span-3 p-7 min-h-[200px]',
]

export function ServicesBento() {
  return (
    <section id="directory" className="relative py-28 md:py-40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        {/* Section header */}
        <div className="mb-16">
          <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-body text-foreground/80">
            What you get
          </span>
          <BlurText
            text="Everything you need to trade."
            className="mt-4 font-display font-bold uppercase text-4xl md:text-5xl lg:text-6xl leading-[0.9] tracking-tight max-w-[20ch]"
            delay={0.08}
            startDelay={0.05}
          />
          <p className="mt-4 font-body text-foreground/60 text-base max-w-lg leading-relaxed">
            A complete community exchange platform built for Georgia, by Georgians.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {SERVICES.map((service, idx) => {
            const Icon = ICONS[service.icon] ?? Layers
            return (
              <motion.div
                key={service.title}
                className={`liquid-glass rounded-2xl relative overflow-hidden group ${CARD_CLASSES[idx]}`}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              >
                <div className="liquid-glass-strong rounded-full w-11 h-11 flex items-center justify-center mb-5">
                  <Icon className="size-5 text-foreground" />
                </div>
                <h3 className="font-display font-bold uppercase text-2xl md:text-3xl leading-[0.95] tracking-tight mb-3 max-w-[18ch]">
                  {service.title}
                </h3>
                <p className="font-body text-sm text-foreground/60 max-w-[38ch] leading-relaxed">
                  {service.body}
                </p>
                <ArrowUpRight className="absolute top-6 right-6 size-5 text-foreground/30 group-hover:text-foreground/70 transition-colors" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
