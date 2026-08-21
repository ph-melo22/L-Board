import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'
import { rateLimit } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/email'
import { auditLog } from '@/lib/auditLog'
import { escapeHtml, inviteEmailHtml } from '@/lib/emailTemplates'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_ROLES = ['founder', 'manager', 'financial', 'developer', 'employee', 'sales']

export async function POST(request: NextRequest) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Apenas founders podem convidar membros' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? user!.id
  if (!rateLimit(`invite:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Limite de convites atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  try {
    const { full_name, email, role } = await request.json()

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }

    const safeRole = VALID_ROLES.includes(role) ? role : 'employee'
    const safeName = String(full_name).slice(0, 100)

    const supabase = createAdminClient()
    const appUrl = request.nextUrl.origin

    // Gera o link de convite sem enviar e-mail pelo Supabase
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${appUrl}/auth/confirm` },
    })
    if (linkError) throw linkError

    // Cria o perfil com o role correto e na mesma organização do convidante
    const { error: profileError } = await supabase.from('profiles').insert({
      id: linkData.user.id,
      email,
      full_name: safeName,
      role: safeRole,
      organization_id: profile.organization_id,
    })
    if (profileError) throw profileError

    // Usa nossa própria rota /auth/confirm (verifyOtp com token_hash) em vez do
    // action_link cru do Supabase: links gerados via admin API não têm um
    // code_verifier PKCE no navegador de quem recebe o convite, então o fluxo
    // via /auth/callback (exchangeCodeForSession) sempre falha para eles.
    const inviteUrl = `${appUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=invite`

    await sendEmail({
      to: email,
      subject: 'Você foi convidado para o L Board',
      html: inviteEmailHtml(escapeHtml(safeName), inviteUrl),
    })

    auditLog({
      actor_id:        user!.id,
      organization_id: profile.organization_id,
      action:          'team.member_invited',
      target_id:       email,
      metadata:        { role: safeRole, name: safeName },
      ip:              request.headers.get('x-forwarded-for'),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/invite] falha ao processar convite:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro ao processar convite' }, { status: 400 })
  }
}
