import { z } from "zod"

export const historiaMaxLength = 750

export const esenciaSchema = z.object({
  valores: z
    .string({ required_error: "Cuéntanos los valores que guían tu marca." })
    .trim()
    .min(8, "Comparte al menos 8 caracteres sobre tus valores."),
  diferencia: z
    .string({ required_error: "Necesitamos saber qué hace única a tu marca." })
    .trim()
    .min(8, "Describe tu diferencial en al menos 8 caracteres."),
  historia: z
    .string()
    .trim()
    .max(historiaMaxLength, `Tu historia puede tener hasta ${historiaMaxLength} caracteres.`)
    .optional()
    .refine(
      (value) => value === undefined || value.length === 0 || value.length >= 30,
      "Escribe una historia breve de al menos 30 caracteres.",
    ),
  marcaId: z
    .number({ required_error: "No pudimos identificar tu marca. Inicia sesión nuevamente." })
    .int()
    .positive(),
})

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}
