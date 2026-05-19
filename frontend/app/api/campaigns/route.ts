import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
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
    const { nombre, mensaje, categoria_filter, bot_id, programada_para, imagen_url } = body

    if (!nombre || !mensaje) {
      return NextResponse.json({ error: 'nombre y mensaje son requeridos' }, { status: 400 })
    }

    if (user.rol === 'manager' && !bot_id) {
      return NextResponse.json({ error: 'bot_id es requerido para managers' }, { status: 400 })
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
      programada_para: programada_para || null,
      imagen_url: imagen_url || null,
    })

    return NextResponse.json(newCampaign, { status: 201 })
  } catch (err: any) {
    console.error('Error creando campaña:', err)
    return NextResponse.json({ error: err.message || 'Error creando campaña' }, { status: 500 })
  }
}

async function sendTelegram(token: string, chatId: number, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function sendTelegramPhoto(token: string, chatId: number, imagenUrl: string, caption: string): Promise<boolean> {
  try {
    const filePath = join(process.cwd(), 'public', imagenUrl)
    const fileBuffer = await readFile(filePath)
    const filename = imagenUrl.split('/').pop() ?? 'image.jpg'

    const form = new FormData()
    form.append('chat_id', String(chatId))
    form.append('caption', caption)
    form.append('photo', new Blob([fileBuffer]), filename)

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
    })
    return res.ok
  } catch {
    return false
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.rol !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const due: any[] = db
      .prepare(`SELECT * FROM campaigns WHERE ejecutada = 0 AND (programada_para IS NULL OR programada_para <= ?)`)
      .all(now)

    if (due.length === 0) {
      return NextResponse.json({ count: 0, sent: 0 })
    }

    let totalSent = 0

    for (const campaign of due) {
      // Build leads query matching campaign filters
      const conditions = ['1=1']
      const params: any[] = []
      if (campaign.bot_id) { conditions.push('bot_id = ?'); params.push(campaign.bot_id) }
      if (campaign.categoria_filter) { conditions.push('categoria = ?'); params.push(campaign.categoria_filter) }

      const leads: any[] = db
        .prepare(`SELECT l.telegram_user_id, l.bot_id FROM leads l WHERE ${conditions.join(' AND ')}`)
        .all(...params)

      // Group leads by bot_id to reuse tokens
      const tokenCache: Record<number, string | null> = {}
      const getToken = (botId: number | null): string | null => {
        if (!botId) return null
        if (botId in tokenCache) return tokenCache[botId]
        const row = db.prepare(`SELECT telegram_token FROM bots WHERE id = ? AND estado = 'activo'`).get(botId) as { telegram_token: string } | undefined
        tokenCache[botId] = row?.telegram_token ?? null
        return tokenCache[botId]
      }

      for (const lead of leads) {
        if (!lead.telegram_user_id) continue
        const effectiveBotId = campaign.bot_id ?? lead.bot_id
        const token = getToken(effectiveBotId)
        if (!token) continue
        const ok = campaign.imagen_url
          ? await sendTelegramPhoto(token, lead.telegram_user_id, campaign.imagen_url, campaign.mensaje)
          : await sendTelegram(token, lead.telegram_user_id, campaign.mensaje)
        if (ok) totalSent++
      }

      db.prepare(`UPDATE campaigns SET ejecutada = 1 WHERE id = ?`).run(campaign.id)
    }

    return NextResponse.json({ count: due.length, sent: totalSent })
  } catch (err: any) {
    console.error('Error ejecutando campañas:', err)
    return NextResponse.json({ error: err.message || 'Error al ejecutar campañas' }, { status: 500 })
  }
}
