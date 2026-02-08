import { UserPlus, Filter, TrendingUp } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Captura Leads",
    description:
      "Conecta tus formularios, landing pages y redes sociales. LAIDA captura cada lead automáticamente sin importar de dónde venga.",
    accent: "border-secondary bg-secondary/10",
    numberColor: "text-secondary",
  },
  {
    number: "02",
    icon: Filter,
    title: "Organiza y Califica",
    description:
      "Nuestro sistema inteligente califica y segmenta tus leads para que enfoques tu energía en los que más importan.",
    accent: "border-primary bg-primary/10",
    numberColor: "text-primary",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Convierte y Escala",
    description:
      "Automatiza el seguimiento, cierra más ventas y escala tu negocio con insights accionables en tiempo real.",
    accent: "border-accent bg-accent/10",
    numberColor: "text-accent",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-muted/50 py-24 lg:py-32">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-secondary/15 px-4 py-1.5 text-sm font-semibold text-secondary-foreground">
            Cómo Funciona
          </span>
          <h2 className="mt-6 text-balance font-mono text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Tres pasos hacia el{" "}
            <span className="text-primary">éxito</span>
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Configurar LAIDA es increíblemente simple. En minutos estarás gestionando tus leads como un profesional.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute top-16 left-full hidden h-0.5 w-full bg-secondary/20 lg:block" style={{ width: "calc(100% - 2rem)", left: "calc(50% + 1rem)" }} />
              )}
              <div className={`relative rounded-2xl border-2 ${step.accent} p-8 text-center transition-all hover:shadow-lg`}>
                <span className={`font-mono text-5xl font-bold ${step.numberColor} opacity-30`}>
                  {step.number}
                </span>
                <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5">
                  <step.icon className={`h-7 w-7 ${step.numberColor}`} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
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
