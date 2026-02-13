"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Cómo funciona", href: "#how-it-works" },
  { label: "Testimonios", href: "#testimonials" },
  { label: "Precios", href: "#pricing" },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-secondary/30">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <span className="text-lg font-bold text-primary-foreground">L</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            LAID<span className="text-secondary">A</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-medium text-foreground hover:text-primary">
              Iniciar Sesión
            </Button>
          </Link>
          <Link href="/registro">
            <Button variant="outline" className="text-sm font-medium text-foreground hover:bg-secondary/10">
              Registrar
            </Button>
          </Link>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 font-semibold">
            Probar Gratis
          </Button>
        </div>

        <button
          type="button"
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-secondary/20 bg-background px-6 py-6 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/login" className="w-full">
                <Button variant="ghost" className="w-full justify-center text-foreground">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/registro" className="w-full">
                <Button variant="outline" className="w-full justify-center text-foreground">
                  Registrar
                </Button>
              </Link>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold">
                Probar Gratis
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
