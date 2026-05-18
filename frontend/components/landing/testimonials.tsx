import { Star } from "lucide-react"

const testimonials = [
  {
    name: "María Rodríguez",
    role: "CEO, Creativa Digital",
    avatar: "MR",
    avatarBg: "bg-secondary",
    quote:
      "LAIDA transformó la forma en que manejamos nuestros leads. Antes perdíamos el 60% de las oportunidades, ahora convertimos el triple.",
    stars: 5,
  },
  {
    name: "Carlos López",
    role: "Director Comercial, TechStart",
    avatar: "CL",
    avatarBg: "bg-primary",
    quote:
      "La interfaz es súper intuitiva. Mi equipo la adoptó en un día y la productividad se disparó desde la primera semana.",
    stars: 5,
  },
  {
    name: "Ana Martínez",
    role: "Fundadora, EcoVentas",
    avatar: "AM",
    avatarBg: "bg-accent",
    quote:
      "Somos un negocio pequeño y necesitábamos algo simple pero poderoso. LAIDA es exactamente eso. El bot de IA nos cambió el juego completamente.",
    stars: 5,
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="relative bg-muted/50 py-24 lg:py-32">
      <div className="absolute top-10 left-1/4 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
      <div className="absolute bottom-10 right-1/4 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-secondary/15 px-4 py-1.5 text-sm font-semibold text-secondary-foreground">
            Testimonios
          </span>
          <h2 className="mt-6 text-balance font-mono text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Lo que dicen nuestros{" "}
            <span className="text-secondary">clientes</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative rounded-2xl border border-secondary/20 bg-card p-8 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              {/* Pink accent corner */}
              <div className="absolute top-0 right-0 h-16 w-16 rounded-bl-3xl bg-secondary/10" />
              
              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                ))}
              </div>

              {/* Quote */}
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {`"${t.quote}"`}
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${t.avatarBg} text-sm font-bold text-primary-foreground`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
