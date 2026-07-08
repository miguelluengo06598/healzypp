import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )
}

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await getServerSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user.id
  } catch {
    return null
  }
}
