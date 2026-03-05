import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import db from '@/db/init'
import { getAllCampaigns, createCampaign } from '@/db/utils'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // determine which bots the user can see campaigns for
    let allowedBots: number[] | null = null
    if (user.rol === 'manager') {
      const stmt = db.prepare(`SELECT bot_id FROM usuario_bots WHERE usuario_id = ?`)
      const rows: any[] = stmt.all(user.id)
      const botIds = rows.map(r => r.bot_id)
      if (botIds.length === 0) {
        return NextResponse.json([])
      }
      allowedBots = botIds
    }

    const { searchParams } = new URL(request.url)
    const botId = searchParams.get('botId')
    if (botId) {
      const idNum = Number(botId)
      if (allowedBots && !allowedBots.includes(idNum)) {
        return NextResponse.json([], { status: 403 })
      }
      allowedBots = [idNum]
    }

    const campaigns = getAllCampaigns(allowedBots || undefined)
    return NextResponse.json(campaigns)
  } catch (err) {
    console.error('Error listing campaigns:', err)
    return NextResponse.json({ error: 'Error al obtener campañas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, mensaje, categoria_filter, bot_id, programada_para } = body

    if (!nombre || !mensaje) {
      return NextResponse.json({ error: 'nombre y mensaje son requeridos' }, { status: 400 })
    }

    if (bot_id) {
      // validate manager's access
      if (user.rol === 'manager') {
        const stmt = db.prepare(`SELECT bot_id FROM usuario_bots WHERE usuario_id = ? AND bot_id = ?`)
        const row = stmt.get(user.id, bot_id)
        if (!row) {
          return NextResponse.json({ error: 'No autorizado para ese bot' }, { status: 403 })
        }
      }
    }

    const newCampaign = createCampaign({
      nombre,
      mensaje,
      categoria_filter: categoria_filter || null,
      bot_id: bot_id || null,
      programada_para: programada_para || null
    })

    return NextResponse.json(newCampaign, { status: 201 })
  } catch (err: any) {
    console.error('Error creando campaña:', err)
    return NextResponse.json({ error: err.message || 'Error creando campaña' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const dueStmt = db.prepare(`SELECT * FROM campaigns WHERE ejecutada = 0 AND (programada_para IS NULL OR programada_para <= ?)`)
    const due: any[] = dueStmt.all(now)

    const updateStmt = db.prepare(`UPDATE campaigns SET ejecutada = 1 WHERE id = ?`)
    due.forEach(c => updateStmt.run(c.id))

    return NextResponse.json({ processed: due, count: due.length })
  } catch (err) {
    console.error('Error ejecutando campañas:', err)
    return NextResponse.json({ error: 'Error al ejecutar campañas' }, { status: 500 })
  }
}
