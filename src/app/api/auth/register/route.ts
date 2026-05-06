import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

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

    // Welcome email (fire-and-forget — não bloqueia o registro)
    sendEmail({
      to: email,
      subject: 'Bem-vindo ao L Board!',
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
          <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">L Board</h1>
            <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Hub Operacional</p>
          </div>
          <div style="background:#fff;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
            <p style="margin:0 0 16px;">Olá, <strong>${full_name}</strong>!</p>
            <p style="margin:0 0 16px;color:#374151;">Sua conta foi criada com sucesso. A empresa <strong>${company_name}</strong> já está configurada no L Board.</p>
            <p style="margin:0 0 24px;color:#374151;">Acesse o dashboard para começar a gerenciar seus clientes, projetos e equipe.</p>
            <hr style="border:none;border-top:1px solid #f4f4f5;margin:0 0 16px;"/>
            <p style="margin:0;font-size:12px;color:#9ca3af;">L Board · Se você não criou esta conta, ignore este e-mail.</p>
          </div>
        </div>
      `,
    }).catch(() => undefined)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao criar conta'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
