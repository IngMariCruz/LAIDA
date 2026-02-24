import db from "@/db/init"
import { EsenciaRecord } from "@/lib/marca/types"

interface CreateEsenciaParams {
  valores: string
  diferencia: string
  historia?: string
  marcaId: number
}

export function createEsencia(params: CreateEsenciaParams): EsenciaRecord {
  const insertStmt = db.prepare(`
    INSERT INTO esencia (valores, diferencia, historia, marca_id)
    VALUES (?, ?, ?, ?)
  `)

  const result = insertStmt.run(
    params.valores,
    params.diferencia,
    params.historia ?? "",
    params.marcaId,
  )

  const findStmt = db.prepare("SELECT * FROM esencia WHERE id = ?")
  return findStmt.get(Number(result.lastInsertRowid)) as EsenciaRecord
}
