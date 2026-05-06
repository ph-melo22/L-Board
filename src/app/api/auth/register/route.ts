import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, company_name } = await request.json()

    if (!full_name || !email || !password || !company_name) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Create auth user (skip email confirmation)
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })
    if (userError) {
      const msg = userError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already been registered')) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
      }
      throw userError
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: company_name })
      .select()
      .single()
    if (orgError) {
      await supabase.auth.admin.deleteUser(userData.user.id)
      throw orgError
    }

    // Create profile with role=founder
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userData.user.id,
      email,
      full_name,
      role: 'founder',
      organization_id: org.id,
    })
    if (profileError) {
      await supabase.auth.admin.deleteUser(userData.user.id)
      await supabase.from('organizations').delete().eq('id', org.id)
      throw profileError
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar conta'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
