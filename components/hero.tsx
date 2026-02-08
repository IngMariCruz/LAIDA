import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background pt-32 pb-20 md:pt-40 md:pb-28">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5" />
        <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-secondary/10" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-muted-foreground">
              Plataforma inteligente de leads
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground text-balance md:text-6xl md:leading-tight">
            Convierte cada contacto en una{" "}
            <span className="text-primary">oportunidad real</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Captura, organiza y da seguimiento a tus leads desde un solo lugar. 
            LAIDA automatiza tu pipeline de ventas para que cierres mas negocios, mas rapido.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base font-semibold"
            >
              Comenzar gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border text-foreground hover:bg-muted px-8 py-6 text-base font-semibold bg-transparent"
            >
              Ver demo
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Sin tarjeta de credito · Configuracion en 2 minutos
          </p>
        </div>

        {/* Dashboard preview */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-border bg-card p-2 shadow-xl shadow-primary/5">
            <div className="rounded-xl bg-muted p-6">
              {/* Fake dashboard header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="h-3 w-28 rounded bg-foreground/10" />
                  <div className="mt-2 h-2 w-20 rounded bg-foreground/5" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded-lg bg-primary/20" />
                  <div className="h-8 w-20 rounded-lg bg-accent/20" />
                </div>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: "Leads totales", value: "2,847", color: "bg-primary" },
                  { label: "Convertidos", value: "423", color: "bg-accent" },
                  { label: "En pipeline", value: "1,284", color: "bg-secondary" },
                  { label: "Tasa conversion", value: "14.8%", color: "bg-primary" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-background p-4"
                  >
                    <div className={`mb-2 h-1 w-10 rounded ${stat.color}`} />
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
              {/* Fake table rows */}
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-background p-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/15" />
                    <div className="flex-1">
                      <div className="h-2.5 w-32 rounded bg-foreground/10" />
                      <div className="mt-1.5 h-2 w-20 rounded bg-foreground/5" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-accent/15" />
                    <div className="h-2 w-12 rounded bg-foreground/5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
