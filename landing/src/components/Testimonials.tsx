import { Quote } from 'lucide-react'
import { BlurText } from '@/components/BlurText'
import { TESTIMONIALS } from '@/lib/constants'

function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-7 w-[340px] md:w-[400px] shrink-0 flex flex-col gap-5">
      <Quote className="size-5 text-primary/70" />
      <p className="font-body text-foreground/85 italic leading-relaxed text-[15px] flex-1">
        {quote}
      </p>
      <div className="mt-auto flex items-center gap-3">
        <div className="size-9 rounded-full bg-gradient-to-br from-primary/50 to-secondary/50 shrink-0" />
        <div>
          <p className="font-body font-medium text-sm text-foreground">{name}</p>
          <p className="font-body text-xs text-foreground/50 uppercase tracking-wide">{role}</p>
        </div>
      </div>
    </div>
  )
}

const ROW_A = [...TESTIMONIALS, ...TESTIMONIALS]
const ROW_B = [...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4), ...TESTIMONIALS.slice(4), ...TESTIMONIALS.slice(0, 4)]

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-28 md:py-40 border-t border-border/40">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)] mb-16">
        <span className="liquid-glass rounded-full px-4 py-1.5 text-xs font-body text-foreground/80">
          Founding members
        </span>
        <BlurText
          text="They speak better than we do."
          className="mt-4 font-display font-bold uppercase text-4xl md:text-5xl lg:text-6xl leading-[0.9] tracking-tight max-w-[20ch]"
          delay={0.08}
          startDelay={0.05}
        />
      </div>

      <div className="flex flex-col gap-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        {/* Row A — left */}
        <div
          className="flex gap-5 w-max hover:[animation-play-state:paused]"
          style={{ animation: 'marquee 32s linear infinite' }}
        >
          {ROW_A.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>
        {/* Row B — right */}
        <div
          className="flex gap-5 w-max hover:[animation-play-state:paused]"
          style={{ animation: 'marquee-rev 38s linear infinite' }}
        >
          {ROW_B.map((t, i) => (
            <TestimonialCard key={i} {...t} />
          ))}
        </div>
      </div>
    </section>
  )
}
