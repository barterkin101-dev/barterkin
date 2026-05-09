'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const variantsMap = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
}

interface FadeInProps {
  children: ReactNode
  variant?: keyof typeof variantsMap
  delay?: number
  duration?: number
  className?: string
  once?: boolean
  amount?: number
}

export function FadeIn({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration,
  className,
  once = true,
  amount = 0.3,
}: FadeInProps) {
  const selected = variantsMap[variant]
  const customTransition = duration
    ? { ...selected.visible, transition: { ...(selected.visible as any).transition, duration, delay } }
    : { ...selected.visible, transition: { ...(selected.visible as any).transition, delay } }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={{
        hidden: selected.hidden,
        visible: customTransition,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
// Stagger wrapper for grids / lists
/* ------------------------------------------------------------------ */

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

const childFadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
}

interface StaggerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  once?: boolean
  amount?: number
  role?: string
  'aria-label'?: string
  id?: string
}

export function Stagger({
  children,
  className,
  staggerDelay = 0.12,
  once = true,
  amount = 0.2,
  role,
  'aria-label': ariaLabel,
  id,
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
      role={role}
      aria-label={ariaLabel}
      id={id}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  role,
  'aria-label': ariaLabel,
  id,
}: {
  children: ReactNode
  className?: string
  role?: string
  'aria-label'?: string
  id?: string
}) {
  return (
    <motion.div
      variants={childFadeUp}
      className={className}
      role={role}
      aria-label={ariaLabel}
      id={id}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
// Hover lift for cards
/* ------------------------------------------------------------------ */

export function HoverLift({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
