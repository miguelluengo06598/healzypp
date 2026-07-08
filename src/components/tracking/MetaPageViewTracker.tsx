'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useMetaPixel } from '@/hooks/useMetaPixel'

export function MetaPageViewTracker() {
  const pathname = usePathname()
  const { trackPageView } = useMetaPixel()
  useEffect(() => { trackPageView() }, [pathname, trackPageView])
  return null
}
