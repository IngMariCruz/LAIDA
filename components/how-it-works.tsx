import { UserPlus, Filter, TrendingUp } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Captura tus leads",
    description:
      "Conecta tus formularios, landing pages y redes sociales. Cada contacto entra automaticamente a tu CRM.",
  },
  {
    number: "02",
    icon: Filter,
    title: "Califica y segmenta",
    description:
      "Usa scoring automatico para priorizar leads. Segmentalos por fuente, interes o cualquier criterio personalizado.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Convierte y crece",
    description:
      "Realiza seguimientos automatizados, mide resultados y optimiza tu embudo para maximizar conversiones.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Como funciona
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Tres pasos para transformar tu gestion de leads
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line (hidden on mobile & last item) */}
              {index < steps.length - 1 && (
                <div className="absolute top-12 left-[calc(50%+40px)] hidden h-px w-[calc(100%-80px)] bg-border md:block" />
              )}

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-background border border-border shadow-sm">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
