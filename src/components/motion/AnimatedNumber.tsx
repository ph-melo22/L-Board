'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

export function AnimatedNumber({ value, format, duration = 0.9, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const prevValue = useRef(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const controls = animate(prevValue.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        node.textContent = format ? format(latest) : Math.round(latest).toString()
      },
    })

    prevValue.current = value
    return () => controls.stop()
  }, [value, duration, format])

  return <span ref={ref} className={className}>{format ? format(0) : '0'}</span>
}
