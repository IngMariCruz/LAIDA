import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Gratis",
    description: "Para emprendedores que empiezan",
    price: "Gratis",
    period: "",
    features: [
      "Hasta 50 leads/mes",
      "1 usuario",
      "Dashboard de conversaciones",
      "Bot de IA básico",
      "Registro manual de leads",
      "Soporte por email",
    ],
    cta: "Empezar Gratis",
    popular: false,
    style: "border-border bg-card",
    buttonStyle: "border-2 border-secondary text-secondary-foreground hover:bg-secondary/10 bg-transparent",
  },
  {
    name: "Profesional",
    description: "Para pequeñas empresas en crecimiento",
    price: "$79.900",
    period: "/mes COP",
    features: [
      "Leads ilimitados",
      "Hasta 3 usuarios",
      "Analytics avanzados",
      "Bot de IA con respuestas personalizadas",
      "Gestión de conversaciones completa",
      "Lead scoring inteligente",
      "Reportes de rendimiento",
      "Soporte prioritario",
    ],
    cta: "Probar 14 Días Gratis",
    popular: true,
    style: "border-secondary bg-card shadow-xl pink-glow",
    buttonStyle: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  {
    name: "Business",
    description: "Para negocios con múltiples sucursales o marcas",
    price: "$159.900",
    period: "/mes COP",
    features: [
      "Todo lo del plan Profesional",
      "Usuarios ilimitados",
      "Múltiples marcas y sucursales",
      "Personalización avanzada del bot",
      "Exportación de datos e informes",
      "Historial completo de conversaciones",
      "Soporte dedicado",
    ],
    cta: "Contactar Ventas",
    popular: false,
    style: "border-border bg-card",
    buttonStyle: "border-2 border-secondary text-secondary-foreground hover:bg-secondary/10 bg-transparent",
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-secondary/30" />
      <div className="absolute top-20 left-10 h-52 w-52 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-secondary/15 px-4 py-1.5 text-sm font-semibold text-secondary-foreground">
            Precios
          </span>
          <h2 className="mt-6 text-balance font-mono text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Planes que se adaptan a{" "}
            <span className="text-primary">tu negocio</span>
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Sin sorpresas. Sin contratos. Cancela cuando quieras.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 ${plan.style} p-8 transition-all hover:shadow-lg`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-5 py-1.5 text-xs font-bold text-foreground">
                  Más Popular
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mt-6">
                <span className="font-mono text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </div>

              <ul className="mt-8 flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                      <Check className="h-3 w-3 text-secondary-foreground" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-8 w-full rounded-full py-6 font-bold ${plan.buttonStyle}`}
                size="lg"
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
