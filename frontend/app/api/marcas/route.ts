import { NextRequest, NextResponse } from "next/server"
import { getAllMarcas, getMarcaByUsuarioId } from "@/db/utils"
import { getAuthUser, requireManager } from "@/lib/auth"

// GET - super_admin: todas las marcas; manager: solo su propia marca
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)

    if (!requireManager(user)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    if (user.rol === "manager") {
      const marca = getMarcaByUsuarioId(user.id)
      return NextResponse.json(marca ? [marca] : [])
    }

    const marcas = getAllMarcas().map((marca) => ({
      id: marca.id,
      usuario_id: marca.usuario_id,
      nombre_marca: marca.nombre_marca,
      created_at: marca.created_at,
      actualizado_en: marca.actualizado_en,
    }))

    return NextResponse.json(marcas)
  } catch (error) {
    console.error("Error obteniendo marcas:", error)
    return NextResponse.json({ error: "Error al obtener marcas" }, { status: 500 })
  }
}
