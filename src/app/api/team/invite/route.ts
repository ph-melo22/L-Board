import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, role } = await request.json()

    if (!email || !full_name) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Send invite email via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email)
    if (authError) throw authError

    // Pre-create the profile with the correct role
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name,
      role: role ?? 'employee',
    })
    if (profileError) throw profileError

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
