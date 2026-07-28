import type { Metadata } from 'next'
import SeguimientoClient from './SeguimientoClient'
import { SITE_NAME, SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: `Seguimiento de pedido | ${SITE_NAME}`,
  description:
    'Consulta el estado de tu pedido con tu número de pedido y tu email, sin necesidad de crear una cuenta.',
  alternates: { canonical: `${SITE_URL}/seguimiento` },
  // Es un formulario de consulta con datos personales: no aporta nada en
  // buscadores y no queremos que se indexen posibles URLs con ?pedido=...
  robots: { index: false, follow: true },
}

export default function SeguimientoPage() {
  return <SeguimientoClient />
}
