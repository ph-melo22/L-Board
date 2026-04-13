import { createClient } from '@supabase/supabase-js'

// Admin client uses the service_role key — NEVER expose this on the client side.
// Only used in API routes (server-side).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
