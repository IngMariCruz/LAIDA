"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-32">
      {/* Background decorations */}
      <div className="absolute top-20 -left-32 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
      <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-secondary/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border-2 border-secondary/40 bg-secondary/10 px-5 py-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-secondary-foreground">
              Plataforma #1 para PyMEs
            </span>
          </div>

          {/* Heading */}
          <h1 className="max-w-4xl text-balance font-mono text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Convierte cada{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">lead</span>
              <span className="absolute bottom-1 left-0 -z-0 h-3 w-full bg-secondary/40 md:bottom-2 md:h-4" />
            </span>{" "}
            en una oportunidad{" "}
            <span className="text-secondary">real</span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            LAIDA te ayuda a capturar, organizar y convertir tus leads en clientes.
            La plataforma inteligente que impulsa el crecimiento de tu negocio.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="group bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-6 text-base font-bold shadow-lg blue-glow transition-all hover:scale-105"
            >
              Empieza Gratis
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-2 border-secondary px-8 py-6 text-base font-semibold text-secondary-foreground hover:bg-secondary/10 transition-all bg-transparent"
            >
              Ver Demo
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-14 flex flex-col items-center gap-4">
            <div className="flex -space-x-3">
              {[
                "bg-primary",
                "bg-secondary",
                "bg-accent",
                "bg-primary/80",
                "bg-secondary/80",
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-background ${bg} text-xs font-bold text-primary-foreground`}
                >
                  {["MR", "CL", "JP", "AN", "SV"][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">+2,500 PyMEs</span> ya gestionan sus leads con LAIDA
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="relative mt-16 w-full max-w-5xl">
            <div className="absolute -inset-1 rounded-2xl bg-secondary/20 blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border-2 border-secondary/30 bg-card shadow-2xl pink-glow">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DashboardMockup() {
  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-secondary" />
          <div className="h-3 w-3 rounded-full bg-primary" />
          <div className="h-3 w-3 rounded-full bg-accent" />
        </div>
        <div className="h-6 w-48 rounded-full bg-muted" />
        <div className="h-8 w-24 rounded-full bg-secondary/30" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Leads Totales", value: "1,247", change: "+12%", color: "bg-primary/10 text-primary" },
          { label: "Conversiones", value: "342", change: "+8%", color: "bg-secondary/20 text-secondary-foreground" },
          { label: "Tasa Conv.", value: "27.4%", change: "+3.2%", color: "bg-accent/10 text-accent" },
          { label: "Revenue", value: "$48.2K", change: "+15%", color: "bg-secondary/20 text-secondary-foreground" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
            <p className="text-xs font-medium opacity-70">{stat.label}</p>
            <p className="mt-1 text-xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-accent">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="mt-6 flex gap-4">
        <div className="flex-1 rounded-xl border border-secondary/20 bg-muted/50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Leads por Semana</span>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary-foreground">Últimos 30 días</span>
          </div>
          <div className="flex h-32 items-end gap-2">
            {[40, 65, 45, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md transition-all"
                style={{
                  height: `${h}%`,
                  backgroundColor: i % 3 === 0 ? '#E8A6C8' : i % 3 === 1 ? '#2FB4ED' : '#1FBF9B'
                }}
              />
            ))}
          </div>
        </div>
        <div className="hidden w-48 flex-col gap-3 md:flex">
          {[
            { name: "Email", pct: 38, color: "bg-primary" },
            { name: "Redes Sociales", pct: 28, color: "bg-secondary" },
            { name: "Web", pct: 22, color: "bg-accent" },
            { name: "Referidos", pct: 12, color: "bg-primary/50" },
          ].map((src) => (
            <div key={src.name} className="rounded-lg border border-secondary/20 bg-muted/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{src.name}</span>
                <span className="font-bold text-muted-foreground">{src.pct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                <div className={`h-full rounded-full ${src.color}`} style={{ width: `${src.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
