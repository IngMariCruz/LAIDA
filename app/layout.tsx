import React from "react"
import type { Metadata } from 'next'
import { Poppins, Space_Grotesk } from 'next/font/google'

import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'LAIDA - Gestiona tus Leads, Impulsa tu Negocio',
  description: 'Captura, organiza y convierte tus leads en clientes con LAIDA. La plataforma inteligente de gestion de leads disenada para PyMEs que quieren crecer.',
}

export const viewport = {
  themeColor: '#2FB4ED',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${poppins.variable} ${spaceGrotesk.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
