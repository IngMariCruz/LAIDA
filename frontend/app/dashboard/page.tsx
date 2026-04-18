"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const usuarioStr = localStorage.getItem("usuario")
    if (!usuarioStr) {
      router.push("/login")
      return
    }

    const usuario = JSON.parse(usuarioStr)
    
    // Redirigir según el rol
    if (usuario.rol === "super_admin") {
      router.push("/dashboard/admin")
    } else {
      router.push("/dashboard/manager")
    }
  }, [router])

  if (loading) {
    return null
  }

  return null
}
