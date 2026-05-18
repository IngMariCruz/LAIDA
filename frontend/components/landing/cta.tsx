import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="absolute inset-0 bg-foreground" />
      
      {/* Decorative pink elements */}
      <div className="absolute top-0 left-0 h-full w-1 bg-secondary" />
      <div className="absolute top-0 right-0 h-full w-1 bg-secondary" />
      <div className="absolute top-10 right-20 h-40 w-40 rounded-full bg-secondary/15 blur-3xl" />
      <div className="absolute bottom-10 left-20 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute top-0 left-1/2 h-1 w-32 -translate-x-1/2 bg-secondary" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
          Empieza hoy
        </div>
        <h2 className="mt-8 text-balance font-mono text-3xl font-bold tracking-tight text-background md:text-5xl lg:text-6xl">
          Tu próximo cliente ya está{" "}
          <span className="text-secondary">buscándote</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-background/70">
          No dejes escapar oportunidades. Únete a miles de micro y pequeñas empresas que ya transformaron
          su gestión de leads con LAIDA.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="group rounded-full bg-primary px-10 py-6 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-105"
          >
            Empieza Gratis Ahora
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full border-2 border-secondary bg-transparent px-8 py-6 text-base font-semibold text-secondary hover:bg-secondary/10"
          >
            Agendar Demo
          </Button>
        </div>
        <p className="mt-6 text-sm text-background/50">
          Sin tarjeta de crédito. Configura en 2 minutos.
        </p>
      </div>
    </section>
  )
}
