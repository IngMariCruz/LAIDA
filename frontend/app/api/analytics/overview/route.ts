import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import db from '@/db/init'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const marcaIdParam = searchParams.get('marcaId')
    const marcaId = marcaIdParam ? Number(marcaIdParam) : null
    const productoIdParam = searchParams.get('productoId')
    const productoId = productoIdParam ? Number(productoIdParam) : null

    let botFilter = ''
    let botFilterAliasL = ''
    let params: any[] = []

    if (user.rol === 'manager') {
      const rows: any[] = db.prepare(`SELECT bot_id FROM usuario_bots WHERE usuario_id = ?`).all(user.id)
      const botIds = rows.map(r => r.bot_id)
      if (botIds.length === 0) {
        return NextResponse.json({
          totalLeads: 0, leadsByCategory: [], leadsByBot: [], leadsByDay: [], popularProducts: []
        })
      }
      botFilter      = `WHERE bot_id IN (${botIds.map(() => '?').join(',')})`
      botFilterAliasL = `WHERE l.bot_id IN (${botIds.map(() => '?').join(',')})`
      params = botIds
    } else if (marcaId) {
      botFilter       = `WHERE marca_id = ?`
      botFilterAliasL = `WHERE l.marca_id = ?`
      params = [marcaId]
    }

    // total leads
    const totalLeads = db.prepare(`SELECT COUNT(*) as count FROM leads ${botFilter}`)
      .get(...params)?.count ?? 0

    // leads by category (con filtro opcional por producto)
    let catProductoFilter = ''
    if (productoId) {
      catProductoFilter = botFilter ? ` AND producto_id = ?` : ` WHERE producto_id = ?`
    }
    const catParams = productoId ? [...params, productoId] : params
    const leadsByCategory = db.prepare(
      `SELECT categoria, COUNT(*) as count FROM leads ${botFilter}${catProductoFilter} GROUP BY categoria`
    ).all(...catParams)

    // leads by bot
    const leadsByBot = db.prepare(`
      SELECT COALESCE(b.nombre, l.bot_nombre) as bot_nombre, COUNT(*) as count
      FROM leads l
      LEFT JOIN bots b ON b.id = l.bot_id
      ${botFilterAliasL || botFilter}
      GROUP BY l.bot_id
    `).all(...params)

    // leads last 7 days
    const dayWhere = botFilter
      ? `${botFilter} AND created_at >= DATE('now','-7 days')`
      : `WHERE created_at >= DATE('now','-7 days')`
    const leadsByDay = db.prepare(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM leads
      ${dayWhere}
      GROUP BY DATE(created_at)
    `).all(...params)

    // popular products
    // Manager: filtra por bot_id en el JOIN; super_admin+marca: filtra por p.marca_id en WHERE
    let prodJoinExtra = ''
    let prodWhere = ''
    let prodParams: any[] = []

    if (user.rol === 'manager') {
      const placeholders = params.map(() => '?').join(',')
      prodJoinExtra = ` AND l.bot_id IN (${placeholders})`
      prodWhere = `WHERE p.marca_id IN (SELECT DISTINCT marca_id FROM bots WHERE id IN (${placeholders}))`
      prodParams = [...params, ...params]
    } else if (marcaId) {
      prodWhere = `WHERE p.marca_id = ?`
      prodParams = [marcaId]
    }

    const popularProducts = db.prepare(`
      SELECT p.nombre, COUNT(l.id) as count
      FROM productos p
      LEFT JOIN leads l ON l.producto_id = p.id${prodJoinExtra}
      ${prodWhere}
      GROUP BY p.id
      ORDER BY count DESC
      LIMIT 50
    `).all(...prodParams)

    return NextResponse.json({ totalLeads, leadsByCategory, leadsByBot, leadsByDay, popularProducts })
  } catch (err) {
    console.error('Error analytics:', err)
    return NextResponse.json({ error: 'Error al obtener analytics' }, { status: 500 })
  }
}
