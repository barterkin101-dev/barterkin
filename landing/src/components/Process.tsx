import { BlurText } from '@/components/BlurText'
import { PROCESS_STEPS } from '@/lib/constants'

export function Process() {
  return (
    <section id="process" className="relative py-28 md:py-40 border-t border-border/40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
        <div className="mb-16">
          <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-body text-foreground/80">
            How it works
          </span>
          <BlurText
            text="Four steps. One community."
            className="mt-4 font-display font-bold uppercase text-4xl md:text-5xl lg:text-6xl leading-[0.9] tracking-tight max-w-[20ch]"
            delay={0.08}
            startDelay={0.05}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 relative">
          {PROCESS_STEPS.map((step, i) => (
            <div key={step.n} className="relative px-6 md:px-8 py-10 md:py-14 flex flex-col gap-4 items-start border-t md:border-t-0 md:border-l border-border/40 first:border-t-0 first:border-l-0">
              <span className="font-display font-black text-[80px] md:text-[112px] leading-none text-primary/20 -mb-4 select-none tabular-nums">
                {step.n.padStart(2, '0')}
              </span>
              <h3 className="font-display font-bold uppercase text-2xl md:text-2xl tracking-tight">
                {step.title}
              </h3>
              <p className="font-body text-sm text-foreground/60 leading-relaxed max-w-[30ch]">
                {step.body}
              </p>
              {i < PROCESS_STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/50 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
