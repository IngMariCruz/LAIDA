"use client"

import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

interface Notificacion {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  created_at: string
}

export function useNotificacionesToast() {
  const { toast } = useToast()
  const lastCheckRef = useRef<Date>(new Date())
  const shownNotificationsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const checkNewNotifications = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        const res = await fetch("/api/notificaciones?action=unread", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const notificaciones: Notificacion[] = await res.json()
          
          // Filtrar notificaciones nuevas desde la última verificación
          const nuevas = notificaciones.filter(n => {
            const notifDate = new Date(n.created_at)
            return (
              notifDate > lastCheckRef.current &&
              !shownNotificationsRef.current.has(n.id)
            )
          })

          // Mostrar toast para cada nueva notificación
          nuevas.forEach(notif => {
            shownNotificationsRef.current.add(notif.id)
            
            toast({
              title: notif.titulo,
              description: notif.mensaje,
              duration: 5000,
            })
          })

          if (nuevas.length > 0) {
            lastCheckRef.current = new Date()
          }
        }
      } catch (error) {
        console.error("Error verificando notificaciones:", error)
      }
    }

    // Verificar inmediatamente
    checkNewNotifications()

    // Polling cada 30 segundos
    const interval = setInterval(checkNewNotifications, 30000)

    return () => clearInterval(interval)
  }, [toast])
}
