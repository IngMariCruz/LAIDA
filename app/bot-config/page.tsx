"use client"

import { useState } from "react"

type Product = {
  id: number
  name: string
  price: number
}

export default function BotConfigPage() {
  // PYME info
  const [companyName, setCompanyName] = useState("")
  const [description, setDescription] = useState("")
  const [mission, setMission] = useState("")
  const [vision, setVision] = useState("")
  const [brandTone, setBrandTone] = useState("")

  // Prompt
  const [prompt, setPrompt] = useState("")

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")

  const addProduct = () => {
    if (!productName.trim() || !productPrice) return

    setProducts([
      ...products,
      {
        id: Date.now(),
        name: productName,
        price: Number(productPrice),
      },
    ])

    setProductName("")
    setProductPrice("")
  }

  const removeProduct = (id: number) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
      <h1 className="text-3xl font-bold">Configuración del Bot 🤖</h1>

      {/* PYME INFO */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Información de la PYME</h2>

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Nombre de la empresa"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder="Descripción de la empresa"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder="Misión"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
        />

        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder="Visión"
          value={vision}
          onChange={(e) => setVision(e.target.value)}
        />

        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder="Identidad / tono de marca (ej: cercana, profesional, juvenil)"
          value={brandTone}
          onChange={(e) => setBrandTone(e.target.value)}
        />
      </section>

      {/* PROMPT */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Prompt inicial del bot</h2>

        <textarea
          className="w-full border rounded px-3 py-2 min-h-[120px]"
          placeholder="Ej: Eres un asistente virtual de la empresa X. Tu objetivo es..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </section>

      {/* PRODUCTS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Productos</h2>

        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Nombre del producto"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />

          <input
            type="number"
            className="w-40 border rounded px-3 py-2"
            placeholder="Precio"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
          />

          <button
            onClick={addProduct}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Agregar
          </button>
        </div>

        <ul className="space-y-2">
          {products.map((product) => (
            <li
              key={product.id}
              className="border rounded px-4 py-2 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-600">
                  ${product.price.toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => removeProduct(product.id)}
                className="text-red-600 text-sm"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ACTION */}
      <section>
        <button
          onClick={() => {
            console.log({
              companyName,
              description,
              mission,
              vision,
              brandTone,
              prompt,
              products,
            })
            alert("Configuración lista (por ahora solo en memoria)")
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Guardar configuración
        </button>
      </section>
    </main>
  )
}