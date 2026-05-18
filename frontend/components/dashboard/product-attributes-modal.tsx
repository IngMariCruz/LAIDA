'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, GripVertical } from 'lucide-react'

interface Atributo {
  id?: number
  producto_id: number
  nombre: string
  tipo: 'text' | 'number' | 'select' | 'color'
  opciones: string | null
  requerido: number
  orden: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  productoId: number
  productoNombre: string
  onAtributosActualizados: () => void
}

export function ProductAttributesModal({
  open,
  onOpenChange,
  productoId,
  productoNombre,
  onAtributosActualizados,
}: Props) {
  const [atributos, setAtributos] = useState<Atributo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newAtributo, setNewAtributo] = useState<Partial<Atributo>>({
    nombre: '',
    tipo: 'text',
    opciones: null,
    requerido: 0,
  })
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const getAuthHeader = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Cargar atributos cuando se abre el modal
  const cargarAtributos = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/productos/atributos?productoId=${productoId}`, {
        headers: getAuthHeader(),
      })
      if (!res.ok) throw new Error('Error al cargar atributos')
      const data = await res.json()
      setAtributos(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar atributos')
    } finally {
      setLoading(false)
    }
  }

  const agregarAtributo = async () => {
    if (!newAtributo.nombre?.trim()) {
      setError('El nombre del atributo es requerido')
      return
    }

    if (!newAtributo.tipo) {
      setError('El tipo es requerido')
      return
    }

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/productos/atributos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          producto_id: productoId,
          nombre: newAtributo.nombre,
          tipo: newAtributo.tipo,
          opciones: newAtributo.opciones,
          requerido: newAtributo.requerido ? 1 : 0,
          orden: atributos.length,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al crear atributo')
      }

      const atributoCreado = await res.json()
      setAtributos([...atributos, atributoCreado])
      setNewAtributo({
        nombre: '',
        tipo: 'text',
        opciones: null,
        requerido: 0,
      })
    } catch (err: any) {
      setError(err.message || 'Error al crear atributo')
    } finally {
      setSaving(false)
    }
  }

  const eliminarAtributo = async (atributoId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este atributo?')) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/productos/atributos?id=${atributoId}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al eliminar atributo')
      }

      setAtributos(atributos.filter((a) => a.id !== atributoId))
    } catch (err: any) {
      setError(err.message || 'Error al eliminar atributo')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !loading && atributos.length === 0) {
      cargarAtributos()
    }
    onOpenChange(newOpen)
  }

  const moverAtributo = (fromIndex: number, toIndex: number) => {
    const newAtributos = [...atributos]
    const [moved] = newAtributos.splice(fromIndex, 1)
    newAtributos.splice(toIndex, 0, moved)
    
    // Actualizar orden
    const updated = newAtributos.map((a, idx) => ({ ...a, orden: idx }))
    setAtributos(updated)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atributos - {productoNombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulario para agregar nuevo atributo */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h3 className="font-semibold mb-3">Nuevo atributo</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label htmlFor="attr-name">Nombre del atributo</Label>
                <Input
                  id="attr-name"
                  placeholder="Ej: Color, Tamaño, Material"
                  value={newAtributo.nombre || ''}
                  onChange={(e) =>
                    setNewAtributo({ ...newAtributo, nombre: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="attr-type">Tipo</Label>
                <Select
                  value={newAtributo.tipo}
                  onValueChange={(value: any) =>
                    setNewAtributo({ ...newAtributo, tipo: value })
                  }
                >
                  <SelectTrigger id="attr-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="select">Selección</SelectItem>
                    <SelectItem value="color">Color</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newAtributo.tipo === 'select' && (
              <div className="mb-3">
                <Label htmlFor="attr-options">
                  Opciones (separadas por comas)
                </Label>
                <Input
                  id="attr-options"
                  placeholder="Ej: Rojo, Azul, Verde"
                  value={newAtributo.opciones || ''}
                  onChange={(e) =>
                    setNewAtributo({ ...newAtributo, opciones: e.target.value })
                  }
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="attr-required"
                checked={!!newAtributo.requerido}
                onCheckedChange={(checked) =>
                  setNewAtributo({
                    ...newAtributo,
                    requerido: checked ? 1 : 0,
                  })
                }
              />
              <Label htmlFor="attr-required" className="cursor-pointer">
                Requerido
              </Label>
            </div>

            <Button
              onClick={agregarAtributo}
              disabled={saving}
              className="mt-3 w-full"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Agregando...' : 'Agregar atributo'}
            </Button>
          </div>

          {/* Lista de atributos existentes */}
          {loading ? (
            <p className="text-center py-4">Cargando atributos...</p>
          ) : atributos.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No hay atributos definidos
            </p>
          ) : (
            <div className="space-y-2">
              <h3 className="font-semibold">Atributos existentes</h3>
              {atributos.map((attr, idx) => (
                <div
                  key={attr.id || idx}
                  draggable
                  onDragStart={() => setDraggingIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingIndex !== null && draggingIndex !== idx) {
                      moverAtributo(draggingIndex, idx)
                      setDraggingIndex(null)
                    }
                  }}
                  className={`p-3 border rounded-lg flex items-center justify-between cursor-move transition ${
                    draggingIndex === idx ? 'bg-blue-100 border-blue-400' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{attr.nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        Tipo: {attr.tipo}
                        {attr.opciones && ` • Opciones: ${attr.opciones}`}
                        {attr.requerido && ' • Requerido'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => eliminarAtributo(attr.id!)}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={() => {
              onAtributosActualizados()
              onOpenChange(false)
            }}
          >
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
