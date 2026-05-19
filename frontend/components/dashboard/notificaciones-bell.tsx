"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Notificacion {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  leida: number
  created_at: string
  lead_id?: number
  bot_id?: number
}

export default function NotificacionesBell() {
  const router = useRouter()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const cargarNotificaciones = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      // Obtener contador
      const countRes = await fetch("/api/notificaciones?action=count", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (countRes.ok) {
        const { count } = await countRes.json()
        setUnreadCount(count)
      }

      // Obtener notificaciones no leídas
      const notifRes = await fetch("/api/notificaciones?action=unread", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (notifRes.ok) {
        const data = await notifRes.json()
        setNotificaciones(data)
      }
    } catch (error) {
      console.error("Error cargando notificaciones:", error)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    cargarNotificaciones()
    
    // Polling cada 30 segundos para actualizaciones en tiempo real
    const interval = setInterval(() => {
      cargarNotificaciones()
    }, 30000)

    return () => clearInterval(interval)
  }, [mounted])

  // Evita mismatch de hidratación (Radix genera IDs distintos SSR/cliente)
  if (!mounted) return null

  const marcarComoLeida = async (id: number) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/notificaciones/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setNotificaciones((prev) => prev.filter((n) => n.id !== id))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marcando notificación:", error)
    }
  }

  const marcarTodasLeidas = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const res = await fetch("/api/notificaciones", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "mark_all_read" }),
      })

      if (res.ok) {
        setNotificaciones([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marcando todas como leídas:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Ahora"
    if (minutes < 60) return `Hace ${minutes}m`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`

    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })
  }

  const getIconForTipo = (tipo: string) => {
    switch (tipo) {
      case "nuevo_lead":
        return "🎉"
      case "lead_actualizado":
        return "📝"
      case "nuevo_bot":
        return "🤖"
      case "sistema":
        return "⚙️"
      default:
        return "📢"
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasLeidas}
              disabled={loading}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                No hay notificaciones nuevas
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 hover:bg-accent/50 transition-colors cursor-pointer relative group"
                  onClick={() => {
                    marcarComoLeida(notif.id)
                    if (notif.tipo === 'sistema' && notif.titulo.toLowerCase().includes('campaña')) {
                      setOpen(false)
                      router.push('/dashboard/campaigns')
                    }
                  }}
                >
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      marcarComoLeida(notif.id)
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>

                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getIconForTipo(notif.tipo)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notif.titulo}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notif.mensaje}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
