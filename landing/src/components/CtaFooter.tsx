import { motion } from 'motion/react'
import { FOOTER_LINKS } from '@/lib/constants'

const FOREST = 'hsl(120 28% 17%)'
const CLAY   = 'hsl(27 55% 55%)'

export function CtaFooter() {
  return (
    <>
      {/* Ready to trade? */}
      <section className="py-20 md:py-28 text-center">
        <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)]">
          <motion.h2
            className="font-display font-bold text-3xl md:text-4xl text-foreground mb-4"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            Ready to trade?
          </motion.h2>
          <motion.p
            className="font-body text-muted-foreground mb-8 text-[15px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            Takes two minutes. Email-verify, fill in what you offer, and you're in the directory.
          </motion.p>
          <motion.div
            className="flex items-center gap-4 justify-center flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.18, duration: 0.5 }}
          >
            <a
              href="https://barterkin.com/signup"
              style={{ background: CLAY }}
              className="text-white rounded-xl px-8 py-3.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Join Barterkin
            </a>
            <a
              href="https://barterkin.com/guidelines"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Read the community guidelines
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer bar */}
      <footer style={{ background: FOREST }} className="py-8">
        <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-body">
          <span className="text-white/45">
            © 2026 Barterkin · A Georgia community skills directory
          </span>
          <nav className="flex items-center gap-1">
            {FOOTER_LINKS.map((l, i) => (
              <span key={l.href} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/25">·</span>}
                <a href={l.href} className="text-white/45 hover:text-white/80 transition-colors px-1">
                  {l.label}
                </a>
              </span>
            ))}
          </nav>
          <a href="https://barterkin.com/signin" className="text-white/45 hover:text-white/80 transition-colors">
            Sign in
          </a>
        </div>
      </footer>
    </>
  )
}
