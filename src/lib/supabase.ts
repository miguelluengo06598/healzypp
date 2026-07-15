import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copia .env.local.example como .env.local y rellena los valores.'
  )
}

// Cliente para componentes cliente ("use client"). Usa @supabase/ssr para
// persistir la sesión en cookies (no localStorage) — es lo que permite que
// el guard de /account (src/app/account/layout.tsx, @supabase/ssr en el
// servidor) reconozca una sesión iniciada aquí. Con el createClient() plano
// de supabase-js, la sesión vivía solo en localStorage y el guard
// server-side nunca la veía: todo login real quedaba rebotado por /account.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// ─────────────────────────────────────────────────────────────────────────────
// Cliente de servicio — solo para Server Actions y API Routes
// Bypasa RLS → NUNCA lo importes en componentes cliente
// ─────────────────────────────────────────────────────────────────────────────

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Faltan variables de entorno de Supabase. ' +
      'Comprueba NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
