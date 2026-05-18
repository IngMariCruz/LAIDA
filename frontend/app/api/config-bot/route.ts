import { NextRequest, NextResponse } from "next/server"
import { getMarcaById, saveConfigBot, getConfigBotByMarcaId } from "@/db/utils"
import fs from "fs"
import path from "path"

type ConfigBotPayload = {
  marca_id?: number
  mensaje_bienvenida?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const marcaId = searchParams.get("marcaId")

    if (!marcaId || Number.isNaN(Number(marcaId))) {
      return NextResponse.json({ success: false, message: "marcaId requerido" }, { status: 400 })
    }

    const config = getConfigBotByMarcaId(Number(marcaId))

    if (!config) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || "Error obteniendo configuración" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ConfigBotPayload
    const marca_id = Number(body.marca_id)
    const mensaje_bienvenida = String(body.mensaje_bienvenida ?? "").trim()

    if (!Number.isInteger(marca_id) || marca_id <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "marca_id es requerido y debe ser un número válido",
        },
        { status: 400 },
      )
    }

    if (!mensaje_bienvenida) {
      return NextResponse.json(
        {
          success: false,
          message: "mensaje_bienvenida es requerido",
        },
        { status: 400 },
      )
    }

    const marca = getMarcaById(marca_id)
    if (!marca) {
      return NextResponse.json(
        {
          success: false,
          message: "La marca indicada no existe",
        },
        { status: 404 },
      )
    }

    const config = saveConfigBot({ marca_id, mensaje_bienvenida })

    // Señal al bot para que recargue su configuración
    try {
      const dbDir = path.dirname(process.env.DB_PATH ?? path.join(process.cwd(), "laida.db"))
      fs.writeFileSync(path.join(dbDir, `reload_bot_${marca_id}.flag`), Date.now().toString())
    } catch { /* no bloquear si falla */ }

    return NextResponse.json(
      {
        success: true,
        data: config,
      },
      { status: 201 },
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Error guardando configuración del bot",
      },
      { status: 500 },
    )
  }
}
