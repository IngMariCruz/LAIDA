import {
  Target,
  BarChart3,
  Users,
  Workflow,
  Bell,
  Shield,
} from "lucide-react"

const features = [
  {
    icon: Target,
    title: "Captura inteligente",
    description:
      "Recoge leads desde formularios, redes sociales y tu sitio web. Todo llega automaticamente a tu pipeline.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: Workflow,
    title: "Pipeline visual",
    description:
      "Arrastra y suelta tus leads por cada etapa del embudo. Visualiza tu progreso en tiempo real.",
    accent: "bg-accent/10 text-accent",
  },
  {
    icon: BarChart3,
    title: "Analitica avanzada",
    description:
      "Dashboards con metricas claras sobre conversion, fuentes y rendimiento de tu equipo.",
    accent: "bg-secondary/30 text-foreground",
  },
  {
    icon: Users,
    title: "Gestion de equipo",
    description:
      "Asigna leads, define roles y colabora con tu equipo desde una sola plataforma.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: Bell,
    title: "Automatizaciones",
    description:
      "Crea flujos automaticos para seguimientos, asignaciones y notificaciones sin escribir codigo.",
    accent: "bg-accent/10 text-accent",
  },
  {
    icon: Shield,
    title: "Seguridad total",
    description:
      "Tus datos protegidos con cifrado de extremo a extremo, backups automaticos y control de acceso.",
    accent: "bg-secondary/30 text-foreground",
  },
]

export function Features() {
  return (
    <section id="features" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Funcionalidades
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Todo lo que necesitas para gestionar tus leads
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Herramientas poderosas y sencillas para que tu equipo se enfoque en lo que importa: cerrar ventas.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.accent}`}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
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
