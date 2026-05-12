import { NextRequest, NextResponse } from "next/server"
import { getAllMarcas } from "@/db/utils"
import { getAuthUser, requireSuperAdmin } from "@/lib/auth"

// GET - Obtener todas las marcas (solo super_admin)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)

    if (!requireSuperAdmin(user)) {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de Super Admin" },
        { status: 403 }
      )
    }

    const marcas = getAllMarcas().map((marca) => ({
      id: marca.id,
      nombre_marca: marca.nombre_marca,
      correo_empresa: marca.correo_empresa,
      nombre_representante: marca.nombre_representante,
      numero: marca.numero,
      correo_personal: marca.correo_personal,
      fecha_registro: marca.fecha_registro,
      actualizado_en: marca.actualizado_en,
    }))

    return NextResponse.json(marcas)
  } catch (error) {
    console.error("Error obteniendo marcas:", error)
    return NextResponse.json({ error: "Error al obtener marcas" }, { status: 500 })
  }
}
