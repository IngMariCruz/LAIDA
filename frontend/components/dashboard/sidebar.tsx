"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Users, Package, Settings, FileText, Star, GraduationCap } from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem("usuario")
    if (!raw) return
    try {
      const u = JSON.parse(raw)
      setUserRole(u?.rol || null)
    } catch {
      // ignore
    }
  }, [])

  const items = useMemo(() => [
    { label: "Dashboard", href: "/dashboard", icon: FileText },
    { label: "Leads", href: "/dashboard/leads", icon: FileText },
    { label: "Analytics", href: "/dashboard/analytics", icon: Star },
    { label: "Clientes", href: "/dashboard/clientes", icon: Users },
    { label: "Productos", href: "/dashboard/productos", icon: Package },
    { label: "Campañas", href: "/dashboard/campaigns", icon: Star },
    // Solo managers ven "Marca" (super_admin no debe verla)
    ...(userRole === "manager" ? [{ label: "Marca", href: "/dashboard/marca", icon: Star }] : []),
    ...(userRole === "manager" ? [{ label: "Flujo del bot", href: "/dashboard/config-bot", icon: GraduationCap }] : []),
    { label: "Editar perfil", href: "/dashboard/editar-perfil", icon: Settings },
  ], [userRole])

  const handleLogout = () => {
    localStorage.removeItem("usuario")
    localStorage.removeItem("token")
    globalThis.location.href = "/"
  }

  return (
    <aside className="w-64 shrink-0 border-r border-secondary/20 bg-background px-4 py-6 h-full min-h-0 flex flex-col">
      <div className="mb-6 px-2">
        <h3 className="text-lg font-bold">Panel</h3>
      </div>

      <nav className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
        {items.map((it) => {
          const Icon = it.icon as any
          const active = pathname === it.href
          return (
            <Link key={it.href} href={it.href} className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary/5 ${active ? 'bg-secondary/10 font-medium' : 'text-muted-foreground'}`}>
              <Icon className="h-4 w-4" />
              <span>{it.label}</span>
              {it.note && <span className="ml-auto text-xs text-muted-foreground">{it.note}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 px-2">
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
