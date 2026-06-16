import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE() {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = createAdminClient()
  await supabase.from('google_oauth_tokens').delete().eq('user_id', user!.id)

  return NextResponse.json({ success: true })
}
