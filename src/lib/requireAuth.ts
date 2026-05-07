import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

interface Profile {
  role: string
  organization_id: string | null
}

type AuthResult =
  | { user: User; profile: Profile; error: null }
  | { user: null; profile: null; error: NextResponse }

export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return { user: null, profile: null, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
    }
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()
    if (!profile) {
      return { user: null, profile: null, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
    }
    return { user, profile, error: null }
  } catch {
    return { user: null, profile: null, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  }
}
