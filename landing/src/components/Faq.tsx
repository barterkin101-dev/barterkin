import { motion } from 'motion/react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { FAQ_ITEMS } from '@/lib/constants'

export function Faq() {
  return (
    <section id="faq" className="py-20 md:py-28 border-t border-border">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)] grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-14 md:gap-20">

        {/* Left */}
        <div className="md:sticky md:top-24 md:self-start">
          <motion.p
            className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5 }}
          >
            FAQ
          </motion.p>
          <motion.h2
            className="font-display font-bold text-3xl md:text-4xl text-foreground leading-tight mb-5"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Frequently asked.
          </motion.h2>
          <motion.p
            className="font-body text-sm text-muted-foreground leading-relaxed mb-6 max-w-[28ch]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.16, duration: 0.5 }}
          >
            Everything you need to know before joining. Still have questions?
          </motion.p>
          <motion.a
            href="mailto:hello@barterkin.com"
            className="inline-block border border-border rounded-full px-5 py-2.5 text-sm font-body text-foreground/65 hover:text-foreground hover:border-foreground/25 transition-colors bg-white"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.22, duration: 0.5 }}
          >
            Contact us
          </motion.a>
        </div>

        {/* Right — accordion */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.12, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <Accordion type="single" collapsible>
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="font-body font-semibold text-base text-foreground hover:no-underline hover:text-foreground/80 data-[state=open]:text-foreground text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="font-body text-muted-foreground text-[15px] leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

      </div>
    </section>
  )
}
