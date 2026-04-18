"use client"

export function MarqueeBand() {
  const items = [
    "Captura Leads",
    "Scoring Inteligente",
    "Automatización",
    "Analytics",
    "Pipeline CRM",
    "Seguimiento",
    "Conversiones",
    "Integraciones",
  ]

  return (
    <div className="relative overflow-hidden bg-secondary py-4">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} className="mx-8 text-sm font-bold text-foreground">
            {item}
            <span className="ml-8 text-foreground/50">&#9670;</span>
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  )
}
