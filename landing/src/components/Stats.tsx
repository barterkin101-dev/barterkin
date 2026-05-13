import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { BlurText } from '@/components/BlurText'
import { STATS } from '@/lib/constants'

function StatValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref as React.RefObject<Element>, { once: true, amount: 0.5 })
  return (
    <motion.span
      ref={ref}
      className="font-display font-black italic text-5xl md:text-6xl lg:text-7xl leading-none text-foreground block"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {value}
    </motion.span>
  )
}

export function Stats() {
  return (
    <section className="relative py-32 md:py-44 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1920&q=70&auto=format&fit=crop"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.25) saturate(0.4) hue-rotate(80deg)' }}
      />
      <div className="absolute top-0 inset-x-0 h-[200px] gradient-fade-t" />
      <div className="absolute bottom-0 inset-x-0 h-[200px] gradient-fade-b" />

      <div className="relative z-10 max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        <div className="mb-14 text-center">
          <BlurText
            text="Numbers that mean something."
            className="font-display font-bold uppercase text-4xl md:text-5xl leading-[0.9] tracking-tight mx-auto"
            delay={0.08}
          />
        </div>

        <div className="liquid-glass rounded-3xl p-10 md:p-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 relative">
            {STATS.map((stat, i) => (
              <div key={stat.label} className="relative flex flex-col gap-3">
                {i > 0 && (
                  <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 w-px h-12 bg-border" />
                )}
                <StatValue value={stat.value} />
                <span className="font-body text-sm text-foreground/55 uppercase tracking-widest">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
