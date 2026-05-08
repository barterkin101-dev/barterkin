import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X } from 'lucide-react'

const FOREST = 'hsl(120 28% 17%)'
const CLAY   = 'hsl(27 55% 55%)'

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header style={{ background: FOREST }} className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-[var(--max)] mx-auto px-[var(--gutter)] h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full" style={{ background: CLAY }} />
            <span className="font-display font-bold text-white text-[17px] tracking-tight">Barterkin</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-white/70 hover:text-white transition-colors font-body">
              How it works
            </a>
            <a href="#directory" className="text-sm text-white/70 hover:text-white transition-colors font-body">
              Directory
            </a>
            <a
              href="https://barterkin.com/signup"
              style={{ background: CLAY }}
              className="text-white rounded-lg px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Join
            </a>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white/80 hover:text-white p-1"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ background: FOREST }}
            className="fixed top-16 inset-x-0 z-40 py-8 flex flex-col items-center gap-5 md:hidden border-t border-white/10"
          >
            <a href="#how-it-works" className="text-white/80 hover:text-white font-body transition-colors" onClick={() => setOpen(false)}>How it works</a>
            <a href="#directory"    className="text-white/80 hover:text-white font-body transition-colors" onClick={() => setOpen(false)}>Directory</a>
            <a
              href="https://barterkin.com/signup"
              style={{ background: CLAY }}
              className="text-white rounded-lg px-7 py-3 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              Join
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
