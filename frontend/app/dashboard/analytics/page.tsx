"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer as Chart } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import * as Recharts from 'recharts'

const PRODUCTS_PER_PAGE = 3

const CATEGORIA_LABELS: Record<string, string> = {
  cold: 'Frío',
  warm: 'Tibio',
  hot: 'Caliente',
}

interface Marca {
  id: number
  nombre_marca: string
}

interface Producto {
  id: number
  nombre: string
}

interface AnalyticsData {
  totalLeads: number
  leadsByCategory: { categoria: string; count: number }[]
  leadsByBot: { bot_nombre: string; count: number }[]
  leadsByDay: { day: string; count: number }[]
  popularProducts: { nombre: string; count: number }[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [marcaId, setMarcaId] = useState<number | null>(null)
  const [marcasLoading, setMarcasLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [productPage, setProductPage] = useState(0)
  const [productos, setProductos] = useState<Producto[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  const fetchAnalytics = async (marcaIdParam: number | null, productoIdParam: number | null = null) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/login'); return }

      let qs = marcaIdParam ? `?marcaId=${marcaIdParam}` : ''
      if (productoIdParam) qs += `${qs ? '&' : '?'}productoId=${productoIdParam}`
      const res = await fetch(`/api/analytics/overview${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setProductPage(0)
      } else {
        setError(json.error || 'Error al cargar analytics')
      }
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const usuario = localStorage.getItem('usuario')
    if (!usuario) { router.push('/login'); return }

    const token = localStorage.getItem('token')
    let rol: string | null = null
    try { rol = (JSON.parse(usuario) as { rol?: string }).rol ?? null } catch { /* ignore */ }
    setUserRole(rol)

    fetch('/api/marcas', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((list: Marca[]) => {
        setMarcas(list)
        setMarcasLoading(false)
        if (rol !== 'super_admin' && list.length > 0) {
          setMarcaId(list[0].id)
          fetchAnalytics(list[0].id, null)
        } else {
          fetchAnalytics(null, null)
        }
      })
      .catch(() => {
        setMarcasLoading(false)
        fetchAnalytics(null)
      })
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!marcaId) { setProductos([]); setSelectedProductId(null); return }
    fetch(`/api/productos?marcaId=${marcaId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((list: Producto[]) => setProductos(list.filter(p => p.nombre)))
      .catch(() => setProductos([]))
  }, [marcaId])

  const totalPages = Math.ceil((data?.popularProducts.length ?? 0) / PRODUCTS_PER_PAGE)
  const pagedProducts = data?.popularProducts.slice(
    productPage * PRODUCTS_PER_PAGE,
    productPage * PRODUCTS_PER_PAGE + PRODUCTS_PER_PAGE
  ) ?? []

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  )
  if (error) return <p className="text-center text-red-600">{error}</p>

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {userRole === 'super_admin' && (
          <div className="max-w-xs">
            <Label className="mb-2 block">Marca:</Label>
            {marcasLoading ? (
              <p className="text-sm text-muted-foreground">Cargando marcas...</p>
            ) : (
              <Select
                value={marcaId?.toString() ?? "todas"}
                onValueChange={(value) => {
                  const id = value === "todas" ? null : Number.parseInt(value, 10)
                  setMarcaId(id)
                  setSelectedProductId(null)
                  fetchAnalytics(id, null)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las marcas</SelectItem>
                  {marcas.map((marca) => (
                    <SelectItem key={marca.id} value={marca.id.toString()}>
                      {marca.nombre_marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

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
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle>Leads por categoría</CardTitle>
              {productos.length > 0 && (
                <Select
                  value={selectedProductId?.toString() ?? "todos"}
                  onValueChange={(value: string) => {
                    const pid = value === "todos" ? null : Number.parseInt(value, 10)
                    setSelectedProductId(pid)
                    fetchAnalytics(marcaId, pid)
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los productos</SelectItem>
                    {productos.map((p: Producto) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              {data?.leadsByCategory && (
                <Chart config={{ count: { color: '#10b981', label: 'Leads' } }}>
                  <Recharts.BarChart data={data.leadsByCategory.map((item: { categoria: string; count: number }) => ({ ...item, categoria: CATEGORIA_LABELS[item.categoria] ?? item.categoria }))}>
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
                <>
                  <Chart config={{ count: { color: '#3b82f6', label: 'Leads' } }}>
                    <Recharts.BarChart data={pagedProducts} layout="vertical" height={160}>
                      <Recharts.CartesianGrid strokeDasharray="3 3" />
                      <Recharts.XAxis type="number" />
                      <Recharts.YAxis type="category" dataKey="nombre" width={130} />
                      <Recharts.Tooltip />
                      <Recharts.Bar dataKey="count" fill="#3b82f6" />
                    </Recharts.BarChart>
                  </Chart>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductPage(p => p - 1)}
                        disabled={productPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {productPage + 1} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProductPage(p => p + 1)}
                        disabled={productPage >= totalPages - 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
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
              <Chart config={{ count: { color: '#f59e0b', label: 'Leads' } }}>
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
