import {
  Zap,
  BarChart3,
  Users,
  Mail,
  Target,
  Shield,
} from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Captura Automática",
    description: "Captura leads desde tu web, redes sociales y formularios automáticamente. Sin perder ninguna oportunidad.",
    color: "bg-primary/10 text-primary",
    border: "border-primary/20",
  },
  {
    icon: BarChart3,
    title: "Analytics en Tiempo Real",
    description: "Visualiza el rendimiento de tus campañas con dashboards intuitivos y métricas que importan.",
    color: "bg-secondary/20 text-secondary-foreground",
    border: "border-secondary/30",
  },
  {
    icon: Users,
    title: "Gestión de Pipeline",
    description: "Organiza tus leads por etapas y nunca pierdas el seguimiento de tus prospectos más valiosos.",
    color: "bg-accent/10 text-accent",
    border: "border-accent/20",
  },
  {
    icon: Mail,
    title: "Seguimiento Inteligente",
    description: "Automatiza emails y recordatorios para nutrir tus leads en el momento perfecto.",
    color: "bg-secondary/20 text-secondary-foreground",
    border: "border-secondary/30",
  },
  {
    icon: Target,
    title: "Lead Scoring",
    description: "Prioriza los leads más calientes con scoring inteligente basado en comportamiento y engagement.",
    color: "bg-primary/10 text-primary",
    border: "border-primary/20",
  },
  {
    icon: Shield,
    title: "Seguro y Confiable",
    description: "Tus datos están protegidos con encriptación de nivel empresarial. Cumplimos con todas las regulaciones.",
    color: "bg-accent/10 text-accent",
    border: "border-accent/20",
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32">
      {/* Pink decorative accents */}
      <div className="absolute top-0 left-0 right-0 h-px bg-secondary/30" />
      <div className="absolute top-10 right-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
      <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-secondary/15 px-4 py-1.5 text-sm font-semibold text-secondary-foreground">
            Funcionalidades
          </span>
          <h2 className="mt-6 text-balance font-mono text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Todo lo que necesitas para{" "}
            <span className="text-secondary">crecer</span>
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Herramientas poderosas diseñadas para micro y pequeñas empresas que quieren crecer su negocio sin complicaciones.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group relative rounded-2xl border ${feature.border} bg-card p-8 transition-all hover:shadow-lg hover:-translate-y-1`}
            >
              <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-secondary/5" />
              <div className={`inline-flex rounded-xl p-3 ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
