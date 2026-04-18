"use client"

import { type ComponentType, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Bot,
    Boxes,
    Database,
    MessageCircle,
    PackageSearch,
    Target,
} from "lucide-react"

type BotStep = {
    id: number
    title: string
    icon: ComponentType<{ className?: string }>
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
    const router = useRouter()
    const [canView, setCanView] = useState<boolean | null>(null)

    useEffect(() => {
        const rawUser = localStorage.getItem("usuario")
        if (!rawUser) {
            router.replace("/login")
            return
        }

        try {
            const parsed = JSON.parse(rawUser) as { rol?: string }
            const isManager = parsed?.rol === "manager"
            setCanView(isManager)
            if (!isManager) {
                router.replace("/dashboard")
            }
        } catch {
            router.replace("/login")
        }
    }, [router])

    if (canView !== true) {
        return null
    }

    return (
        <div className="min-h-full bg-background">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Flujo del Bot</h1>
                    <p className="text-sm text-muted-foreground">
                        Sección educativa para entender, de forma simple, cómo atiende el bot a un lead.
                    </p>
                </div>

                <ol className="grid grid-cols-1 gap-6 md:grid-cols-3 md:auto-rows-fr lg:gap-8">
                    {botFlowSteps.map((step) => {
                        const Icon = step.icon

                        return (
                            <li key={step.id} className="h-full">
                                <div className="flex h-full flex-col rounded-lg border border-border/70 bg-card p-6 shadow-sm lg:p-8">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-md bg-secondary/60 p-3 text-foreground lg:p-4">
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-sm text-muted-foreground">Paso {step.id}</p>
                                            <h3 className="text-base font-medium lg:text-lg">{step.title}</h3>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )
                    })}
                </ol>

            </div>
        </div>
    )
}
