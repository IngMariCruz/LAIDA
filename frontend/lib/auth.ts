import { NextRequest } from "next/server"
import { getUsuarioById } from "@/db/utils"

export interface AuthUser {
  id: number
  correo: string
  rol: "super_admin" | "manager"
  nombre?: string | null
}

/**
 * Extrae y valida el token de autorización de los headers
 * TODO: Implementar JWT en lugar de tokens simples
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  
  return authHeader.substring(7)
}

/**
 * Valida el token y retorna el usuario autenticado
 * TODO: Implementar validación JWT
 */
export function validateToken(token: string): AuthUser | null {
  try {
    // Decodificar token simple (formato: id:rol:timestamp)
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const parts = decoded.split(":")
    
    if (parts.length !== 3) {
      return null
    }
    
    const userId = parseInt(parts[0], 10)
    const rol = parts[1]
    
    if (isNaN(userId) || !["super_admin", "manager"].includes(rol)) {
      return null
    }
    
    // Verificar que el usuario existe en la base de datos
    const usuario = getUsuarioById(userId)
    
    if (!usuario || usuario.rol !== rol) {
      return null
    }
    
    return {
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      nombre: usuario.nombre,
    }
  } catch (error) {
    console.error("Error validando token:", error)
    return null
  }
}

/**
 * Obtiene el usuario autenticado desde el request
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = extractToken(request)
  
  if (!token) {
    return null
  }
  
  return validateToken(token)
}

/**
 * Verifica que el usuario autenticado tenga uno de los roles permitidos
 */
export function requireRole(user: AuthUser | null, roles: ("super_admin" | "manager")[]): boolean {
  if (!user) {
    return false
  }
  
  return roles.includes(user.rol)
}

/**
 * Verifica que el usuario sea super admin
 */
export function requireSuperAdmin(user: AuthUser | null): boolean {
  return requireRole(user, ["super_admin"])
}

/**
 * Verifica que el usuario sea manager o super admin
 */
export function requireManager(user: AuthUser | null): boolean {
  return requireRole(user, ["super_admin", "manager"])
}
