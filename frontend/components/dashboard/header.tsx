"use client"

import { useEffect, useState } from "react"
import NotificacionesBell from "@/components/dashboard/notificaciones-bell"

export default function DashboardHeader() {
  const [usuario, setUsuario] = useState<any>(null)

  useEffect(() => {
    const user = localStorage.getItem("usuario")
    if (user) {
      try {
        setUsuario(JSON.parse(user))
      } catch {
        // ignore
      }
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h2 className="text-lg font-semibold">LAIDA</h2>
          {usuario && (
            <p className="text-xs text-muted-foreground">
              {usuario.nombre || usuario.correo}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <NotificacionesBell />
        </div>
      </div>
    </header>
  )
}
