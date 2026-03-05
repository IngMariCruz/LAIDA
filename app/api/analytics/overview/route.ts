import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import db from '@/db/init'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Determine bots accessible
    let botFilter = ''
    let params: any[] = []

    if (user.rol === 'manager') {
      // only bots assigned to this manager
      const stmt = db.prepare(`SELECT bot_id FROM usuario_bots WHERE usuario_id = ?`)
      const rows: any[] = stmt.all(user.id)
      const botIds = rows.map(r => r.bot_id)
      if (botIds.length === 0) {
        // no bots, return empty stats
        return NextResponse.json({
          totalLeads: 0,
          leadsByCategory: [],
          leadsByBot: [],
          leadsByDay: [],
          popularProducts: []
        })
      }
      botFilter = `WHERE bot_id IN (${botIds.map(() => '?').join(',')})`
      params = botIds
    }
    
    // total leads
    const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM leads ${botFilter}`)
    const totalLeadsRow = totalStmt.get(...params)
    const totalLeads = totalLeadsRow?.count || 0

    // leads by category
    const catStmt = db.prepare(`SELECT categoria, COUNT(*) as count FROM leads ${botFilter} GROUP BY categoria`)
    const leadsByCategory = catStmt.all(...params)

    // leads by bot
    const botStmt = db.prepare(`
      SELECT COALESCE(b.nombre, l.bot_nombre) as bot_nombre, COUNT(*) as count
      FROM leads l
      LEFT JOIN bots b ON b.id = l.bot_id
      ${botFilter}
      GROUP BY l.bot_id
    `)
    const leadsByBot = botStmt.all(...params)

    // leads last 7 days
    const dayStmt = db.prepare(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM leads
      ${botFilter}
      AND created_at >= DATE('now','-7 days')
      GROUP BY DATE(created_at)
    `)
    const leadsByDay = dayStmt.all(...params)

    // popular products
    const prodStmt = db.prepare(`
      SELECT p.nombre, COUNT(l.id) as count
      FROM productos p
      LEFT JOIN leads l ON l.producto_id = p.id
      ${botFilter ? botFilter.replace('l.','l.') : ''}
      GROUP BY p.id
      ORDER BY count DESC
      LIMIT 10
    `)
    const popularProducts = prodStmt.all(...params)

    return NextResponse.json({ totalLeads, leadsByCategory, leadsByBot, leadsByDay, popularProducts })
  } catch (err) {
    console.error('Error analytics:', err)
    return NextResponse.json({ error: 'Error al obtener analytics' }, { status: 500 })
  }
}
