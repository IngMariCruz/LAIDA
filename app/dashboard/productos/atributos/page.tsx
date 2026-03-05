'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductAttributesModal } from '@/components/dashboard/product-attributes-modal'
import { Badge } from '@/components/ui/badge'
import { Loader2, Settings2, Search } from 'lucide-react'

interface Producto {
  id: number
  marca_id: number
  nombre: string
  precio: number | string
  descripcion?: string
}

interface ProductoConAtributos extends Producto {
  atributosCount?: number
}

function ProductAttributesContent() {
  const searchParams = useSearchParams()
  const marcaId = searchParams.get('marcaId')
  
  const [productos, setProductos] = useState<ProductoConAtributos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducto, setSelectedProducto] = useState<ProductoConAtributos | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!marcaId) {
      setError('marca_id no disponible')
      setLoading(false)
      return
    }

    const fetchProductos = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/productos?marcaId=${marcaId}`)
        if (!res.ok) throw new Error('Error al cargar productos')
        const data = await res.json()
        
        // Cargar count de atributos para cada producto
        const productosConAtributos = await Promise.all(
          data.map(async (prod: Producto) => {
            try {
              const attrRes = await fetch(`/api/productos/atributos?productoId=${prod.id}`)
              const atributos = attrRes.ok ? await attrRes.json() : []
              return { ...prod, atributosCount: atributos.length }
            } catch {
              return { ...prod, atributosCount: 0 }
            }
          })
        )
        
        setProductos(productosConAtributos)
      } catch (err: any) {
        setError(err.message || 'Error al cargar productos')
      } finally {
        setLoading(false)
      }
    }

    fetchProductos()
  }, [marcaId])

  const filteredProductos = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAbrirModal = (producto: ProductoConAtributos) => {
    setSelectedProducto(producto)
    setModalOpen(true)
  }

  const handleAtributosActualizados = async () => {
    // Recargar count de atributos para el producto actualizado
    if (selectedProducto && marcaId) {
      try {
        const attrRes = await fetch(`/api/productos/atributos?productoId=${selectedProducto.id}`)
        const atributos = attrRes.ok ? await attrRes.json() : []
        
        setProductos(
          productos.map((p) =>
            p.id === selectedProducto.id
              ? { ...p, atributosCount: atributos.length }
              : p
          )
        )
      } catch {
        // Silent error
      }
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Atributos de Productos</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los atributos de tus productos para enriquecer el catálogo
          </p>
        </div>

        {!marcaId && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <p className="text-sm text-orange-800">
                ⚠️ No se especificó marca_id. Por favor, accede desde la página de productos.
              </p>
            </CardContent>
          </Card>
        )}

        {marcaId && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-red-800">{error}</p>
                </CardContent>
              </Card>
            ) : filteredProductos.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    {productos.length === 0
                      ? 'No hay productos para esta marca'
                      : 'No se encontraron productos que coincidan'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProductos.map((producto) => (
                  <Card
                    key={producto.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleAbrirModal(producto)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="line-clamp-2">{producto.nombre}</CardTitle>
                          <CardDescription className="mt-1">
                            {typeof producto.precio === 'string' 
                              ? producto.precio 
                              : `$${Number(producto.precio).toFixed(2)}`}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Atributos</p>
                          <p className="text-2xl font-bold">
                            {producto.atributosCount || 0}
                          </p>
                        </div>
                        <Badge
                          variant={producto.atributosCount ? 'default' : 'secondary'}
                          className="text-lg px-3 py-1"
                        >
                          {producto.atributosCount ? 'Configurado' : 'Vacío'}
                        </Badge>
                      </div>

                      <Button
                        className="w-full"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAbrirModal(producto)
                        }}
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Gestionar atributos
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {selectedProducto && (
          <ProductAttributesModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            productoId={selectedProducto.id}
            productoNombre={selectedProducto.nombre}
            onAtributosActualizados={handleAtributosActualizados}
          />
        )}
      </div>
    </div>
  )
}

export default function ProductAttributesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-6 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ProductAttributesContent />
    </Suspense>
  )
}
