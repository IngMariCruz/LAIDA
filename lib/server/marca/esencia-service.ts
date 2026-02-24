import { ZodError } from "zod"
import { EsenciaInput, EsenciaResponse } from "@/lib/marca/types"
import { esenciaSchema, normalizeText } from "@/lib/marca/validation"
import { createEsencia } from "@/lib/server/marca/esencia-repository"

export function saveEsencia(input: EsenciaInput): EsenciaResponse {
  try {
    const parsed = esenciaSchema.parse(input)

    const saved = createEsencia({
      valores: normalizeText(parsed.valores),
      diferencia: normalizeText(parsed.diferencia),
      historia: parsed.historia ? normalizeText(parsed.historia) : "",
      marcaId: parsed.marcaId,
    })

    return {
      success: true,
      message: "Tu esencia quedó guardada. Tu marca ya transmite una historia más humana.",
      data: saved,
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = error.flatten().fieldErrors

      return {
        success: false,
        message: "Revisemos juntos algunos campos para continuar.",
        error: "VALIDATION_ERROR",
        fieldErrors: {
          valores: fieldErrors.valores?.[0] || "",
          diferencia: fieldErrors.diferencia?.[0] || "",
          historia: fieldErrors.historia?.[0] || "",
          marcaId: fieldErrors.marcaId?.[0] || "",
        },
      }
    }

    console.error("Error guardando esencia de marca:", error)

    return {
      success: false,
      message: "No logramos guardar tu esencia por ahora. Intenta nuevamente en un momento.",
      error: "INTERNAL_ERROR",
    }
  }
}
