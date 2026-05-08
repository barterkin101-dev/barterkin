import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'

const FOREST = 'hsl(120 28% 17%)'
const CLAY   = 'hsl(27 55% 55%)'

const HEADLINE = ['Trade', 'skills', 'with', 'your', 'Georgia', 'neighbors.']

const COLLAGE = [
  {
    src: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80',
    alt: 'Fresh-baked sourdough loaves',
    cls: 'absolute top-0 left-0 w-[46%] h-[45%]',
    anim: { y: 20, x: 0 },
    delay: 0.5,
  },
  {
    src: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80',
    alt: 'Woodworking craft',
    cls: 'absolute bottom-0 left-0 w-[46%] h-[50%]',
    anim: { y: 20, x: 0 },
    delay: 0.65,
  },
  {
    src: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    alt: 'Community garden harvest',
    cls: 'absolute top-0 right-0 w-[51%] h-[60%]',
    anim: { y: 0, x: 20 },
    delay: 0.8,
  },
  {
    src: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
    alt: 'Farmers market produce',
    cls: 'absolute bottom-0 right-0 w-[51%] h-[36%]',
    anim: { y: 0, x: 20 },
    delay: 0.95,
  },
]

export function Hero() {
  return (
    <section style={{ background: FOREST }} className="overflow-hidden">
      <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)] pt-36 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

        {/* ── Left: Text ── */}
        <div className="flex flex-col">
          {/* Badge */}
          <motion.p
            className="font-body text-xs uppercase tracking-widest text-white/50 mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Georgia residents only · Honor system
          </motion.p>

          {/* Headline — per-word blur animation */}
          <h1 className="font-display font-black text-[clamp(40px,6vw,88px)] leading-[0.9] tracking-[-0.02em] text-white mb-6">
            {HEADLINE.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block will-change-[filter,transform,opacity]"
                style={word === 'Georgia' ? { color: CLAY } : undefined}
                initial={{ filter: 'blur(8px)', opacity: 0, y: 18 }}
                animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}{i < HEADLINE.length - 1 ? '\u00A0' : ''}
              </motion.span>
            ))}
          </h1>

          {/* Subtext */}
          <motion.p
            className="font-body text-base md:text-lg text-white/65 max-w-lg leading-relaxed mb-9"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            Bakers, plumbers, braiders, beekeepers — find people near you offering what you need, and offer back what you make. No money. No middlemen.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex items-center gap-3 flex-wrap mb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.55 }}
          >
            <a
              href="https://barterkin.com/signup"
              style={{ background: CLAY }}
              className="inline-flex items-center gap-2 text-white rounded-xl px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Join the network <ArrowUpRight className="size-4" />
            </a>
            <a
              href="#directory"
              className="inline-flex items-center gap-2 border border-white/20 text-white/80 rounded-xl px-6 py-3 text-sm font-normal hover:bg-white/5 transition-colors"
            >
              Browse the directory
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex items-center gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.25, duration: 0.7 }}
          >
            {[
              { n: '23+', label: 'Georgians' },
              { n: '2+',  label: 'Counties' },
              { n: '10',  label: 'Categories' },
            ].map(({ n, label }) => (
              <div key={label}>
                <span className="font-display font-black text-2xl text-white block">{n}</span>
                <span className="font-body text-xs text-white/45 mt-0.5 block">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: Image mosaic ── */}
        <div className="relative h-[480px] lg:h-[560px] hidden lg:block">
          {COLLAGE.map((img) => (
            <motion.div
              key={img.src}
              className={`${img.cls} overflow-hidden rounded-2xl`}
              initial={{ opacity: 0, scale: 0.92, ...img.anim }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              transition={{ delay: img.delay, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
