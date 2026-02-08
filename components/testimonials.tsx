import { Star } from "lucide-react"

const testimonials = [
  {
    quote:
      "LAIDA transformo nuestra gestion comercial. Pasamos de hojas de calculo a un pipeline visual que todo el equipo entiende.",
    author: "Maria Gonzalez",
    role: "Directora Comercial, TechSoluciones",
    initials: "MG",
  },
  {
    quote:
      "La automatizacion de seguimientos nos ahorro horas cada semana. Nuestros leads ya no se pierden entre correos.",
    author: "Carlos Mendoza",
    role: "CEO, GrowthLab",
    initials: "CM",
  },
  {
    quote:
      "Implementamos LAIDA en 15 minutos y en el primer mes aumentamos nuestras conversiones un 40%. Increible.",
    author: "Ana Ramirez",
    role: "Head of Sales, NovaDigital",
    initials: "AR",
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-secondary-foreground">
            Testimonios
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground text-balance md:text-4xl">
            Equipos que ya confian en LAIDA
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-primary text-primary"
                  />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {`"${t.quote}"`}
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xs font-bold text-primary">
                    {t.initials}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t.author}
                  </p>
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
