import { NextRequest, NextResponse } from 'next/server'
import { getBotFlowConfig, createOrUpdateBotFlowConfig } from '@/db/utils'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const botId = searchParams.get('botId')

    if (!botId) {
      return NextResponse.json({ error: 'botId requerido' }, { status: 400 })
    }

    const config = getBotFlowConfig(Number(botId))
    
    if (!config) {
      // Retornar configuración por defecto si no existe
      return NextResponse.json({
        bot_id: Number(botId),
        mensaje_bienvenida: '¡Hola! 👋 Bienvenido a nuestra tienda.',
        mensaje_sin_interes: 'Entiendo. Si cambias de opinión, aquí estaré para ayudarte. ¡Hasta pronto! 👋',
        mensaje_productos: '¿Te gustaría ver nuestros productos disponibles?',
        mensaje_caracteristicas: '¿Qué características te interesan?',
        mensaje_confirmacion: '¿Confirmas tu interés en este producto?',
        mensaje_agradecimiento: '¡Gracias por tu interés! Un asesor se pondrá en contacto contigo pronto. 😊',
        mostrar_productos_inicio: 1,
        max_productos_mostrar: 5,
        permitir_recomendaciones: 1
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al obtener configuración del bot:', error)
    return NextResponse.json({ 
      error: 'Error al obtener configuración' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admins y managers pueden modificar configuración
    if (!['super_admin', 'manager'].includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const {
      bot_id,
      mensaje_bienvenida,
      mensaje_sin_interes,
      mensaje_productos,
      mensaje_caracteristicas,
      mensaje_confirmacion,
      mensaje_agradecimiento,
      mostrar_productos_inicio,
      max_productos_mostrar,
      permitir_recomendaciones
    } = body

    if (!bot_id) {
      return NextResponse.json({ error: 'bot_id requerido' }, { status: 400 })
    }

    const config = createOrUpdateBotFlowConfig({
      bot_id: Number(bot_id),
      mensaje_bienvenida: mensaje_bienvenida || null,
      mensaje_sin_interes: mensaje_sin_interes || null,
      mensaje_productos: mensaje_productos || null,
      mensaje_caracteristicas: mensaje_caracteristicas || null,
      mensaje_confirmacion: mensaje_confirmacion || null,
      mensaje_agradecimiento: mensaje_agradecimiento || null,
      mostrar_productos_inicio: mostrar_productos_inicio !== undefined ? Number(mostrar_productos_inicio) : 1,
      max_productos_mostrar: max_productos_mostrar !== undefined ? Number(max_productos_mostrar) : 5,
      permitir_recomendaciones: permitir_recomendaciones !== undefined ? Number(permitir_recomendaciones) : 1
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al guardar configuración del bot:', error)
    return NextResponse.json({ 
      error: 'Error al guardar configuración' 
    }, { status: 500 })
  }
}
