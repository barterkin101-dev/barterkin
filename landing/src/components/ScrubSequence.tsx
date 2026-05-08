import { useEffect, useRef } from 'react'

export type ScrubSequenceProps = {
  framesPath: string
  frameCount: number
  ext?: 'jpg' | 'webp'
  className?: string
  scrollTargetRef: React.RefObject<HTMLElement | null>
}

const pad4 = (n: number) => String(n).padStart(4, '0')

export function ScrubSequence({
  framesPath,
  frameCount,
  ext = 'jpg',
  className,
  scrollTargetRef,
}: ScrubSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const rafRef = useRef<number | null>(null)
  const visibleRef = useRef(true)
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  // Preload all frames
  useEffect(() => {
    const imgs: HTMLImageElement[] = []
    const urls = Array.from(
      { length: frameCount },
      (_, i) => `${framesPath}/frame_${pad4(i + 1)}.${ext}`
    )
    const first = new Image()
    first.src = urls[0]
    ;(first as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'high'
    imgs[0] = first
    urls.slice(1).forEach((src, i) => {
      const img = new Image()
      img.src = src
      imgs[i + 1] = img
    })
    imagesRef.current = imgs
  }, [framesPath, frameCount, ext])

  // Resize canvas to viewport with dpr
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Pause rAF when hero is off-screen
  useEffect(() => {
    const el = scrollTargetRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting },
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [scrollTargetRef])

  // Animation loop
  useEffect(() => {
    const getIndex = () => {
      const el = scrollTargetRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
      return Math.min(frameCount - 1, Math.floor(progress * (frameCount - 1)))
    }

    const drawImage = (img: HTMLImageElement) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const cw = canvas.width, ch = canvas.height
      const iw = img.naturalWidth, ih = img.naturalHeight
      const scale = Math.max(cw / iw, ch / ih)
      const dw = iw * scale, dh = ih * scale
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2
      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(img, dx, dy, dw, dh)
    }

    const drawFrame = (idx: number) => {
      const img = imagesRef.current[idx]
      if (img && img.complete && img.naturalWidth > 0) drawImage(img)
    }

    const tick = () => {
      if (visibleRef.current && !prefersReduced.current) {
        drawFrame(getIndex())
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [frameCount, scrollTargetRef])

  // Reduced-motion: static mid-frame
  useEffect(() => {
    if (!prefersReduced.current) return
    const mid = Math.floor(frameCount / 2)
    const img = imagesRef.current[mid]
    const draw = (i: HTMLImageElement) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = window.innerWidth * dpr, ch = window.innerHeight * dpr
      canvas.width = cw; canvas.height = ch
      const scale = Math.max(cw / i.naturalWidth, ch / i.naturalHeight)
      ctx.drawImage(i, (cw - i.naturalWidth * scale) / 2, (ch - i.naturalHeight * scale) / 2, i.naturalWidth * scale, i.naturalHeight * scale)
    }
    if (img?.complete) draw(img)
    else img?.addEventListener('load', () => draw(img), { once: true })
  }, [frameCount])

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        aria-hidden="true"
        style={{ transform: 'translateZ(0)', willChange: 'contents' }}
      />
      <p className="sr-only">
        Cinematic scroll sequence showing Georgia community scenes as you scroll.
      </p>
    </>
  )
}
