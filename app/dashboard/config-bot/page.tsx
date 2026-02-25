"use client"

import { useMemo, useState } from "react"
import {
    Bot,
    Boxes,
    Database,
    MessageCircle,
    PackageSearch,
    Save,
    Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type BotStep = {
    id: number
    title: string
    icon: React.ComponentType<{ className?: string }>
}

const botFlowSteps: BotStep[] = [
    {
        id: 1,
        title: "Obtener contexto",
        icon: Boxes,
    },
    {
        id: 2,
        title: "El lead escribe al bot",
        icon: MessageCircle,
    },
    {
        id: 3,
        title: "Dar mensaje de bienvenida",
        icon: Bot,
    },
    {
        id: 4,
        title: "Preguntar interés",
        icon: PackageSearch,
    },
    {
        id: 5,
        title: "Capturar interés",
        icon: Target,
    },
    {
        id: 6,
        title: "Almacenar datos del lead",
        icon: Database,
    },
]

export default function ConfigBotPage() {
    const [welcomeMessage, setWelcomeMessage] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
    const characterCount = useMemo(() => welcomeMessage.length, [welcomeMessage])

    const getMarcaIdFromSession = (): number | null => {
        const rawUser = localStorage.getItem("usuario")
        if (!rawUser) return null

        try {
            const parsed = JSON.parse(rawUser) as { id?: number | string }
            const parsedId = Number(parsed.id)

            if (!Number.isInteger(parsedId) || parsedId <= 0) {
                return null
            }

            return parsedId
        } catch {
            return null
        }
    }

    const handleSave = async () => {
        setFeedback(null)

        const marcaId = getMarcaIdFromSession()
        if (!marcaId) {
            setFeedback({
                type: "error",
                message: "No se pudo identificar la marca actual. Inicia sesión nuevamente.",
            })
            return
        }

        const mensaje = welcomeMessage.trim()
        if (!mensaje) {
            setFeedback({
                type: "error",
                message: "El mensaje de bienvenida es obligatorio.",
            })
            return
        }

        setIsSaving(true)

        try {
            const response = await fetch("/api/config-bot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    marca_id: marcaId,
                    mensaje_bienvenida: mensaje,
                }),
            })

            const data = (await response.json()) as { success: boolean; message?: string }

            if (!response.ok || !data.success) {
                throw new Error(data.message || "No se pudo guardar la configuración del bot")
            }

            setFeedback({
                type: "success",
                message: "Configuración guardada correctamente.",
            })
        } catch (error) {
            setFeedback({
                type: "error",
                message: error instanceof Error ? error.message : "Ocurrió un error inesperado",
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="mx-auto w-full max-w-3xl space-y-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Configuración del Bot</h1>
                    <p className="text-sm text-muted-foreground">
                        Define el mensaje inicial y visualiza el flujo que seguirá el bot con cada lead.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card className="border-border/70 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Mensaje de bienvenida</CardTitle>
                            <CardDescription>
                                Este mensaje se enviará al iniciar la conversación con un nuevo lead.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="welcome-message">Mensaje de bienvenida del bot</Label>
                                <Textarea
                                    id="welcome-message"
                                    value={welcomeMessage}
                                    onChange={(event) => setWelcomeMessage(event.target.value)}
                                    placeholder="Ejemplo: ¡Hola! Soy el asistente de [Tu Marca]. Cuéntame qué producto te interesa y te ayudaré a elegir la mejor opción."
                                    className="min-h-[220px] resize-none"
                                />
                                <div className="flex items-center justify-end text-xs text-muted-foreground">
                                    <span>{characterCount} caracteres</span>
                                </div>
                            </div>

                            <Button onClick={handleSave} className="w-full" disabled={isSaving}>
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? "Guardando..." : "Guardar configuración"}
                            </Button>

                            {feedback ? (
                                <p
                                    className={`text-sm ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}
                                >
                                    {feedback.message}
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card className="border-border/70 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Flujo del Bot</CardTitle>
                            <CardDescription>
                                Secuencia estimada del recorrido desde el primer mensaje hasta el registro del lead.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {botFlowSteps.map((step) => {
                                    const Icon = step.icon

                                    return (
                                        <li
                                            key={step.id}
                                            className="flex items-center gap-3 rounded-lg border border-border/70 p-4"
                                        >
                                            <div className="rounded-md bg-secondary/60 p-2 text-foreground">
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            <h3 className="text-sm font-medium">
                                                {step.id}. {step.title}
                                            </h3>
                                        </li>
                                    )
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
