import { EsenciaInput, EsenciaResponse } from "@/lib/marca/types"

export async function saveEsenciaRequest(input: EsenciaInput): Promise<EsenciaResponse> {
  const response = await fetch("/api/esencia", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  const data = (await response.json()) as EsenciaResponse

  if (!response.ok) {
    return {
      success: false,
      message: data.message || "No logramos guardar tu esencia.",
      error: data.error || "REQUEST_ERROR",
      fieldErrors: data.fieldErrors,
    }
  }

  return data
}

export async function getEsenciaRequest(marcaId: number) {
  const response = await fetch(`/api/esencia?marcaId=${marcaId}`)

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data || null
}

export async function updateEsenciaRequest(input: EsenciaInput): Promise<EsenciaResponse> {
  const response = await fetch("/api/esencia", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      message: data.error || "No logramos actualizar tu esencia.",
      error: data.error || "REQUEST_ERROR",
    }
  }

  return {
    success: true,
    message: "Tu esencia fue actualizada correctamente.",
    data,
  }
}

export async function deleteEsenciaRequest(marcaId: number) {
  const response = await fetch(`/api/esencia?marcaId=${marcaId}`, {
    method: "DELETE",
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    return {
      success: false,
      message: data.error || "No logramos eliminar tu esencia.",
    }
  }

  return {
    success: true,
    message: "Tu esencia fue eliminada correctamente.",
  }
}
