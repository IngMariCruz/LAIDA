"use client"

import Sidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/header"
import { Toaster } from "@/components/ui/toaster"
import { useNotificacionesToast } from "@/hooks/use-notificaciones-toast"

function DashboardContent({ children }: Readonly<{ children: React.ReactNode }>) {
  useNotificacionesToast()

  return (
    <>
      <div className="h-screen bg-background overflow-hidden">
        <div className="flex h-full">
          <Sidebar />
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <DashboardHeader />
            <main className="flex-1 min-h-0 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardContent>{children}</DashboardContent>
}
