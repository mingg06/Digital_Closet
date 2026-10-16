import { createClient } from '@supabase/supabase-js'

export function createBrowserClient(url?: string, key?: string) {
  if (!url?.trim() || !key?.trim()) return null
  try {
    return createClient(url.trim(), key.trim(), {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  } catch {
    return null
  }
}

export const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
