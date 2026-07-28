'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, AlertCircle, PackageSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { integralCF } from '@/styles/fonts'
import OrderTimeline, { type OrderTrackingEventInput } from '@/sections/OrderTimeline'
import { CONTACT_EMAIL } from '@/lib/site'
import type { OrderStatusEnum } from '@/types/database.types'

interface Resultado {
  numeroPedido: string
  estado: OrderStatusEnum
  incidencia: string | null
  fechaCreacion: string
  fechaActualizacion: string | null
  eventos: OrderTrackingEventInput[]
  items: { nombre: string; cantidad: number }[]
}

function SeguimientoForm() {
  const searchParams = useSearchParams()
  // El email de envío enlaza con ?pedido=ORD-... para que el cliente solo
  // tenga que escribir su email.
  const pedidoInicial = searchParams.get('pedido') ?? ''

  const [numeroPedido, setNumeroPedido] = useState(pedidoInicial)
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    if (pedidoInicial) setNumeroPedido(pedidoInicial)
  }, [pedidoInicial])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    setResultado(null)

    try {
      const res = await fetch('/api/seguimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroPedido, email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'No hemos podido consultar tu pedido.')
        return
      }
      setResultado(data as Resultado)
    } catch {
      setError('Error de conexión. Comprueba tu red e inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-full bg-[#F0F4EC] items-center justify-center mb-3">
            <PackageSearch className="w-6 h-6 text-[#487D26]" />
          </div>
          <h1 className={cn(integralCF.className, 'text-2xl sm:text-3xl')}>
            Seguimiento de pedido
          </h1>
          <p className="text-black/50 text-sm mt-2 max-w-md mx-auto">
            Introduce tu número de pedido y el email con el que compraste. No hace
            falta crear una cuenta.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl border border-[#E5E5E5] p-5 sm:p-6 flex flex-col gap-4"
        >
          <div>
            <label htmlFor="numeroPedido" className="block text-xs font-semibold uppercase tracking-wide text-black/50 mb-1.5">
              Número de pedido
            </label>
            <input
              id="numeroPedido"
              name="numeroPedido"
              type="text"
              required
              value={numeroPedido}
              onChange={(e) => setNumeroPedido(e.target.value)}
              placeholder="ORD-2026-000001"
              autoComplete="off"
              className="w-full h-12 px-4 rounded-xl border border-black/15 focus:border-[#487D26] focus:ring-2 focus:ring-[#487D26]/10 outline-none text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-black/50 mb-1.5">
              Email de la compra
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full h-12 px-4 rounded-xl border border-black/15 focus:border-[#487D26] focus:ring-2 focus:ring-[#487D26]/10 outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="h-12 rounded-full bg-[#487D26] hover:bg-[#3d6b20] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            {cargando ? 'Consultando…' : 'Ver mi pedido'}
          </button>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {resultado && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                Pedido
              </p>
              <p className="font-mono font-bold text-lg">{resultado.numeroPedido}</p>

              {resultado.items.length > 0 && (
                <ul className="mt-3 text-sm text-black/70 space-y-0.5">
                  {resultado.items.map((i, idx) => (
                    <li key={idx}>
                      {i.nombre} × {i.cantidad}
                    </li>
                  ))}
                </ul>
              )}

              {resultado.incidencia && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm text-amber-900">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Incidencia en el envío</p>
                    <p className="mt-0.5">{resultado.incidencia}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mismo componente que /account/orders — un solo sitio donde vive
                la lógica de qué etapa está completada y con qué fecha. */}
            <OrderTimeline
              estado={resultado.estado}
              confirmedAt={resultado.fechaCreacion}
              paidAt={resultado.fechaActualizacion}
              trackingEvents={resultado.eventos}
            />
          </div>
        )}

        <p className="text-center text-xs text-black/40 mt-8">
          ¿No encuentras tu pedido? Escríbenos a{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-black/60">
            {CONTACT_EMAIL}
          </a>
          . Si tienes cuenta, también puedes verlo en{' '}
          <Link href="/account/orders" className="underline hover:text-black/60">
            tus pedidos
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export default function SeguimientoClient() {
  // useSearchParams exige un Suspense boundary en el App Router.
  return (
    <Suspense fallback={null}>
      <SeguimientoForm />
    </Suspense>
  )
}
