import { NextRequest, NextResponse } from "next/server"
import { getBotsAsignadosAUsuario } from "@/db/utils"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(request)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const id = Number(params.id)
  if (user.id !== id && user.rol !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const bots = getBotsAsignadosAUsuario(id)
  return NextResponse.json(
    bots.map(b => ({ id: b.id, nombre: b.nombre, slug: b.slug, estado: b.estado }))
  )
}
