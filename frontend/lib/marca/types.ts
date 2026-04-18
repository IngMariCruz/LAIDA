export interface EsenciaInput {
  valores: string
  diferencia: string
  historia?: string
  marcaId: number
}

export interface EsenciaRecord {
  id: number
  valores: string
  diferencia: string
  historia: string
  marca_id: number
  created_at: string
}

export interface EsenciaResponse {
  success: boolean
  message: string
  data?: EsenciaRecord
  error?: string
  fieldErrors?: Record<string, string>
}
