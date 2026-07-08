// ─────────────────────────────────────────────────────────────────────────────
// ProductSectionWrapper — Wrapper cliente para marcar secciones detectables
// por IntersectionObserver. No añade estilos ni rompe el layout.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import React from 'react'

interface ProductSectionWrapperProps {
  section: string
  children: React.ReactNode
}

/**
 * Envuelve una sección de la página de producto para que sea detectable
 * por el IntersectionObserver de useProductPageTracker.
 */
export default function ProductSectionWrapper({ section, children }: ProductSectionWrapperProps) {
  return (
    <div data-section={section} className="contents">
      {children}
    </div>
  )
}
