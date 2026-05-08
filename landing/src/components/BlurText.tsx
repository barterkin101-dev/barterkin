import { motion, useInView } from 'motion/react'
import { useRef, createElement } from 'react'

type Props = {
  text: string
  className?: string
  delay?: number
  startDelay?: number
  as?: string
}

export function BlurText({
  text,
  className = '',
  delay = 0.07,
  startDelay = 0,
  as = 'h2',
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref as Parameters<typeof useInView>[0], { once: true, amount: 0.3 })
  const words = text.split(' ')

  const children = words.map((w, i) => (
    <motion.span
      key={i}
      className="inline-block will-change-[filter,transform,opacity]"
      initial={{ filter: 'blur(10px)', opacity: 0, y: 24 }}
      animate={inView ? { filter: 'blur(0px)', opacity: 1, y: 0 } : undefined}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
        delay: startDelay + i * delay,
      }}
    >
      {w}
      {i < words.length - 1 ? '\u00A0' : ''}
    </motion.span>
  ))

  return createElement(as, { ref, className }, children)
}
