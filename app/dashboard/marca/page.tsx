"use client"

import { useEffect, useMemo, useState } from "react"
import { Heart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteEsenciaRequest,
  getEsenciaRequest,
  saveEsenciaRequest,
  updateEsenciaRequest,
} from "@/lib/marca/esencia-api"
import { historiaMaxLength } from "@/lib/marca/validation"


type FormData = {
  valores: string
  diferencia: string
  historia: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const initialForm: FormData = {
  valores: "",
  diferencia: "",
  historia: "",
}

export default function MarcaPage() {
  const [form, setForm] = useState<FormData>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasEsencia, setHasEsencia] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const historiaCount = useMemo(() => form.historia.length, [form.historia])
  const historiaProgress = Math.min((historiaCount / historiaMaxLength) * 100, 100)

  const getMarcaId = (): number | null => {
    const raw = localStorage.getItem("usuario")
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw)
      return typeof parsed.id === "number" ? parsed.id : Number(parsed.id)
    } catch {
      return null
    }
  }

  useEffect(() => {
    const loadEsencia = async () => {
      const marcaId = getMarcaId()
      if (!marcaId) return

      const esencia = await getEsenciaRequest(marcaId)
      if (!esencia) return

      setForm({
        valores: esencia.valores || "",
        diferencia: esencia.diferencia || "",
        historia: esencia.historia || "",
      })
      setHasEsencia(true)
    }

    void loadEsencia()
  }, [])

  const validateField = (name: keyof FormData, value: string): string => {
    const trimmed = value.trim()

    if (!trimmed) {
      if (name === "valores") return "Tus valores son el corazón de la marca."
      if (name === "diferencia") return "Tu diferencial ayuda a destacar en el mercado."
      return ""
    }

    if ((name === "valores" || name === "diferencia") && trimmed.length < 8) {
      return "Comparte un poco más para que el mensaje sea claro."
    }

    if (name === "historia") {
      if (trimmed.length < 30) {
        return "Cuenta un poco más de tu recorrido (mínimo 30 caracteres)."
      }
      if (trimmed.length > historiaMaxLength) {
        return `Máximo ${historiaMaxLength} caracteres para mantenerla potente y breve.`
      }
    }

    return ""
  }

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {
      valores: validateField("valores", form.valores),
      diferencia: validateField("diferencia", form.diferencia),
      historia: validateField("historia", form.historia),
    }

    setErrors(nextErrors)
    return !Object.values(nextErrors).some(Boolean)
  }

  const handleInputChange = (name: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    if (feedback) setFeedback(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const marcaId = getMarcaId()
    if (!marcaId) {
      setFeedback({
        type: "error",
        message: "No encontramos tu sesión. Inicia sesión nuevamente para continuar.",
      })
      return
    }

    if (!validateForm()) {
      setFeedback({
        type: "error",
        message: "Ajusta los campos marcados y volvemos a intentarlo.",
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    const result = hasEsencia
      ? await updateEsenciaRequest({ ...form, marcaId })
      : await saveEsenciaRequest({ ...form, marcaId })

    if (!result.success) {
      if (result.fieldErrors) {
        setErrors({
          valores: result.fieldErrors.valores || "",
          diferencia: result.fieldErrors.diferencia || "",
          historia: result.fieldErrors.historia || "",
        })
      }

      setFeedback({
        type: "error",
        message: result.message,
      })
      setIsSaving(false)
      return
    }

    setFeedback({
      type: "success",
      message: result.message,
    })
    setErrors({})
    setHasEsencia(true)
    setIsSaving(false)
  }

  const handleDelete = async () => {
    const marcaId = getMarcaId()
    if (!marcaId) {
      setFeedback({
        type: "error",
        message: "No encontramos tu sesión. Inicia sesión nuevamente para continuar.",
      })
      return
    }

    setIsDeleting(true)
    setFeedback(null)

    const result = await deleteEsenciaRequest(marcaId)

    if (!result.success) {
      setFeedback({
        type: "error",
        message: result.message,
      })
      setIsDeleting(false)
      return
    }

    setForm(initialForm)
    setErrors({})
    setHasEsencia(false)
    setFeedback({
      type: "success",
      message: result.message,
    })
    setIsDeleting(false)
  }

  const inputBaseClass = "transition-all duration-300 focus-visible:scale-[1.01]"

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        <Card className="border-secondary/20 shadow-sm transition-shadow duration-300 hover:shadow-md">
          <CardHeader>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Construye una marca que se sienta auténtica</span>
            </div>
            <CardTitle className="text-2xl">Escencia de </CardTitle>
            <CardDescription>
              Define tu esencia en palabras simples y honestas. Este mensaje será la base para conectar con tus clientes.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="valores">Valores de la marca</Label>
                <Input
                  id="valores"
                  value={form.valores}
                  onChange={(event) => handleInputChange("valores", event.target.value)}
                  placeholder="Ej: cercanía, innovación y transparencia"
                  className={`${inputBaseClass} ${errors.valores ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <p className={`text-xs transition-opacity duration-300 ${errors.valores ? "text-red-600 opacity-100" : "text-muted-foreground opacity-90"}`}>
                  {errors.valores || "Tip: piensa en 3 principios que guían cada decisión de tu marca."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diferencia">¿Qué la hace diferente?</Label>
                <Input
                  id="diferencia"
                  value={form.diferencia}
                  onChange={(event) => handleInputChange("diferencia", event.target.value)}
                  placeholder="Ej: acompañamiento humano y respuestas en minutos"
                  className={`${inputBaseClass} ${errors.diferencia ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <p className={`text-xs transition-opacity duration-300 ${errors.diferencia ? "text-red-600 opacity-100" : "text-muted-foreground opacity-90"}`}>
                  {errors.diferencia || "Habla de una promesa concreta que tu competencia no entrega."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="historia">Historia de la marca (storytelling)</Label>
                <Textarea
                  id="historia"
                  value={form.historia}
                  onChange={(event) => handleInputChange("historia", event.target.value)}
                  placeholder="Opcional: comparte el inicio, el reto más grande y el impacto que sueñas lograr."
                  className={`${inputBaseClass} min-h-[150px] resize-none ${errors.historia ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  maxLength={historiaMaxLength}
                />

                <div className="flex items-center justify-between text-xs">
                  <p className={`transition-colors duration-300 ${errors.historia ? "text-red-600" : "text-muted-foreground"}`}>
                    {errors.historia || "Opcional: si la completas, escribe al menos 30 caracteres."}
                  </p>
                  <span className={`${historiaCount > historiaMaxLength * 0.9 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {historiaCount}/{historiaMaxLength}
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/20">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${historiaProgress}%` }}
                  />
                </div>
              </div>

              {feedback && (
                <div
                  className={`rounded-md border px-3 py-2 text-sm transition-all duration-300 ${
                    feedback.type === "success"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    <span>{feedback.message}</span>
                  </div>
                </div>
              )}

              <CardFooter className="p-0 pt-2">
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={isSaving || isDeleting} className="transition-transform duration-200 hover:scale-[1.01]">
                    {isSaving
                      ? hasEsencia
                        ? "Actualizando esencia..."
                        : "Guardando tu esencia..."
                      : hasEsencia
                        ? "Actualizar esencia"
                        : "Guardar esencia de marca"}
                  </Button>

                  {hasEsencia && (
                    <Button type="button" variant="outline" disabled={isSaving || isDeleting} onClick={handleDelete}>
                      {isDeleting ? "Eliminando..." : "Eliminar esencia"}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
