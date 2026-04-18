"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegistroPage() {
  const [formData, setFormData] = useState({
    nombreMarca: "",
    correoEmpresa: "",
    nombreRepresentante: "",
    numero: "",
    correoPersonal: "",
    password: "",
    confirmPassword: "",
  })

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validar que todos los campos estén completos
      if (
        !formData.nombreMarca ||
        !formData.correoEmpresa ||
        !formData.nombreRepresentante ||
        !formData.numero ||
        !formData.correoPersonal ||
        !formData.password ||
        !formData.confirmPassword
      ) {
        setError("Por favor, completa todos los campos")
        setLoading(false)
        return
      }

      // Validar que los emails sean válidos
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.correoEmpresa) || !emailRegex.test(formData.correoPersonal)) {
        setError("Por favor, ingresa correos válidos")
        setLoading(false)
        return
      }

      // Validar que las contraseñas coincidan
      if (formData.password !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden")
        setLoading(false)
        return
      }

      // Validar longitud de contraseña
      if (formData.password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres")
        setLoading(false)
        return
      }

      // Hacer llamada a la API
      const response = await fetch("/api/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombreMarca: formData.nombreMarca,
          correoEmpresa: formData.correoEmpresa,
          nombreRepresentante: formData.nombreRepresentante,
          numero: formData.numero,
          correoPersonal: formData.correoPersonal,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al registrar. Por favor, intenta de nuevo.")
        setLoading(false)
        return
      }

      setSuccess(true)
      setFormData({
        nombreMarca: "",
        correoEmpresa: "",
        nombreRepresentante: "",
        numero: "",
        correoPersonal: "",
        password: "",
        confirmPassword: "",
      })

      // Redirigir después de 2 segundos
      setTimeout(() => {
        window.location.href = "/login"
      }, 2000)
    } catch (err) {
      setError("Error al registrar. Por favor, intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar simplificado */}
      <header className="border-b border-secondary/30 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Volver</span>
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary ml-2">
            <span className="text-sm font-bold text-primary-foreground">L</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            LAID<span className="text-secondary">A</span>
          </span>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
            <CardDescription>
              Completa el formulario para registrarte en LAIDA
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 w-12 h-12 flex items-center justify-center mx-auto">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-lg">¡Registro exitoso!</h3>
                <p className="text-sm text-muted-foreground">
                  Tu cuenta ha sido creada correctamente. Te redirigiremos en breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreMarca">Nombre de la marca</Label>
                  <Input
                    id="nombreMarca"
                    name="nombreMarca"
                    type="text"
                    placeholder="Ej: Mi Empresa"
                    value={formData.nombreMarca}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correoEmpresa">Correo de la empresa</Label>
                  <Input
                    id="correoEmpresa"
                    name="correoEmpresa"
                    type="email"
                    placeholder="empresa@example.com"
                    value={formData.correoEmpresa}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombreRepresentante">Nombre del representante</Label>
                  <Input
                    id="nombreRepresentante"
                    name="nombreRepresentante"
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={formData.nombreRepresentante}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número de teléfono</Label>
                  <Input
                    id="numero"
                    name="numero"
                    type="tel"
                    placeholder="Ej: +54 1234567890"
                    value={formData.numero}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correoPersonal">Correo personal</Label>
                  <Input
                    id="correoPersonal"
                    name="correoPersonal"
                    type="email"
                    placeholder="tubuscorreo@example.com"
                    value={formData.correoPersonal}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold"
                >
                  {loading ? "Registrando..." : "Registrarse"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/" className="text-primary hover:underline font-medium">
                    Inicia sesión
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
