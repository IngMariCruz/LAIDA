"use client"

import { useEffect, useState, useRef } from "react"

const stats = [
  { value: 2500, suffix: "+", label: "PyMEs Activas", color: "text-primary" },
  { value: 1.2, suffix: "M+", label: "Leads Gestionados", color: "text-secondary-foreground" },
  { value: 34, suffix: "%", label: "Más Conversiones", color: "text-accent" },
  { value: 98, suffix: "%", label: "Satisfacción", color: "text-secondary-foreground" },
]

function useCountUp(end: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          let start = 0
          const increment = end / (duration / 16)
          const timer = setInterval(() => {
            start += increment
            if (start >= end) {
              setCount(end)
              clearInterval(timer)
            } else {
              setCount(Math.floor(start * 10) / 10)
            }
          }, 16)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [end, duration])

  return { count, ref }
}

function StatCard({ stat }: { stat: (typeof stats)[0] }) {
  const { count, ref } = useCountUp(stat.value)

  return (
    <div ref={ref} className="relative rounded-2xl border border-secondary/20 bg-card p-8 text-center transition-all hover:pink-glow">
      <div className="absolute top-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-b-full bg-secondary" />
      <p className={`font-mono text-4xl font-bold ${stat.color} md:text-5xl`}>
        {stat.value < 10 ? count.toFixed(1) : Math.floor(count)}{stat.suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{stat.label}</p>
    </div>
  )
}

export function Stats() {
  return (
    <section className="relative py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  )
}
