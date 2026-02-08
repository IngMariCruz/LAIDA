const stats = [
  { value: "10K+", label: "Equipos activos" },
  { value: "2.5M+", label: "Leads gestionados" },
  { value: "98%", label: "Satisfaccion" },
  { value: "3x", label: "Mas conversiones" },
]

export function StatsBar() {
  return (
    <section className="border-y border-border bg-muted/50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
