"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer as Chart } from '@/components/ui/chart'
import { Loader2 } from 'lucide-react'
import * as Recharts from 'recharts'

interface AnalyticsData {
  totalLeads: number
  leadsByCategory: { categoria: string; count: number }[]
  leadsByBot: { bot_nombre: string; count: number }[]
  leadsByDay: { day: string; count: number }[]
  popularProducts: { nombre: string; count: number }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/analytics/overview')
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'Error al cargar analytics')
        } else {
          setData(json)
        }
      } catch (err: any) {
        setError(err.message || 'Error')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
  if (error) return <p className="text-center text-red-600">{error}</p>

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-center">{data?.totalLeads}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Leads por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.leadsByCategory && (
                <Chart
                  config={{
                    count: { color: '#10b981', label: 'Leads' }
                  }}
                >
                  <Recharts.BarChart data={data.leadsByCategory}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" />
                    <Recharts.XAxis dataKey="categoria" />
                    <Recharts.YAxis />
                    <Recharts.Tooltip />
                    <Recharts.Bar dataKey="count" fill="#10b981" />
                  </Recharts.BarChart>
                </Chart>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos populares</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.popularProducts && (
                <Chart
                  config={{
                    count: { color: '#3b82f6', label: 'Leads' }
                  }}
                >
                  <Recharts.BarChart data={data.popularProducts} layout="vertical" height={300}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" />
                    <Recharts.XAxis type="number" />
                    <Recharts.YAxis type="category" dataKey="nombre" />
                    <Recharts.Tooltip />
                    <Recharts.Bar dataKey="count" fill="#3b82f6" />
                  </Recharts.BarChart>
                </Chart>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leads últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.leadsByDay && (
              <Chart
                config={{
                  count: { color: '#f59e0b', label: 'Leads' }
                }}
              >
                <Recharts.LineChart data={data.leadsByDay}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis dataKey="day" />
                  <Recharts.YAxis />
                  <Recharts.Tooltip />
                  <Recharts.Line type="monotone" dataKey="count" stroke="#f59e0b" />
                </Recharts.LineChart>
              </Chart>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
