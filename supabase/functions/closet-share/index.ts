import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createShareHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const origin = Deno.env.get('APP_ORIGIN') ?? ''
// The privileged client is server-only and never adopts a caller's auth headers.
const admin =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null

Deno.serve(
  createShareHandler(
    {
      async user(jwt) {
        if (!admin) throw new Error('Server configuration missing')
        const { data, error } = await admin.auth.getUser(jwt)
        return error ? null : (data.user?.id ?? null)
      },
      async rpc(name, args) {
        if (!admin) throw new Error('Server configuration missing')
        const { data, error } = await admin.rpc(name, args)
        if (error) throw new Error(error.message)
        return data
      },
      async download(path) {
        if (!admin) return null
        const { data, error } = await admin.storage
          .from('closet-images')
          .download(path)
        return error ? null : data
      },
    },
    origin,
  ),
)
