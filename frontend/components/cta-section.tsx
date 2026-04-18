import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="bg-foreground py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-background text-balance md:text-4xl">
            Empieza a convertir mas leads hoy
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-background/70">
            Unete a miles de equipos que ya usan LAIDA para gestionar su pipeline de ventas y crecer mas rapido.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-base font-semibold"
            >
              Crear cuenta gratis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-background/20 text-background hover:bg-background/10 px-8 py-6 text-base font-semibold bg-transparent"
            >
              Hablar con ventas
            </Button>
          </div>
          <p className="mt-4 text-sm text-background/50">
            Sin tarjeta de credito · Cancela cuando quieras
          </p>
        </div>
      </div>
    </section>
  )
}
