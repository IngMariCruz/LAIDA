"use client"

import Sidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/header"
import { Toaster } from "@/components/ui/toaster"
import { useNotificacionesToast } from "@/hooks/use-notificaciones-toast"

function DashboardContent({ children }: { children: React.ReactNode }) {
  useNotificacionesToast()

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="flex">
          <Sidebar />
          <div className="flex-1">
            <DashboardHeader />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardContent>{children}</DashboardContent>
}
