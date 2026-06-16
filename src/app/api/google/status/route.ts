import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('google_oauth_tokens')
    .select('id, created_at')
    .eq('user_id', user!.id)
    .single()

  return NextResponse.json({ connected: !!data, created_at: data?.created_at ?? null })
}
