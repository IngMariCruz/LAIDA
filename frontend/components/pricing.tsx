import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    description: "Para emprendedores y equipos pequenos.",
    features: [
      "Hasta 500 leads",
      "1 usuario",
      "Pipeline basico",
      "Formularios de captura",
      "Soporte por email",
    ],
    cta: "Comenzar gratis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mes",
    description: "Para equipos en crecimiento que necesitan mas poder.",
    features: [
      "Leads ilimitados",
      "Hasta 10 usuarios",
      "Automatizaciones",
      "Analitica avanzada",
      "Integraciones API",
      "Soporte prioritario",
    ],
    cta: "Empezar prueba gratis",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Personalizado",
    period: "",
    description: "Para grandes organizaciones con necesidades especificas.",
    features: [
      "Todo de Pro",
      "Usuarios ilimitados",
      "SSO y seguridad avanzada",
      "Account manager dedicado",
      "SLA garantizado",
      "Personalizaciones",
    ],
    cta: "Contactar ventas",
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Precios
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Un plan para cada etapa de tu negocio
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Empieza gratis y escala cuando estes listo. Sin compromisos.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all ${
                plan.highlighted
                  ? "border-primary bg-card shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border-border bg-card hover:border-primary/20 hover:shadow-md"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
                    Mas popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-8 w-full ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
