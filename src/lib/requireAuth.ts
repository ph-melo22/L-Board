import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

type AuthResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse }

export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return { user: null, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
    }
    return { user, error: null }
  } catch {
    return { user: null, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  }
}
