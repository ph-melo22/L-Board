import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'
import { rateLimit } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/email'
import { auditLog } from '@/lib/auditLog'
import { escapeHtml, inviteEmailHtml } from '@/lib/emailTemplates'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? user!.id
  if (!rateLimit(`resend-invite:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Limite de reenvios atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const appUrl = request.nextUrl.origin

    const { data: target } = await supabase
      .from('profiles')
      .select('email, full_name, organization_id')
      .eq('id', id)
      .single()

    if (!target || target.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Usa type "recovery" em vez de "invite": o usuário já existe no Supabase
    // Auth (criado no convite original), e generateLink com type "invite" só
    // funciona para e-mails que ainda não têm conta — retornaria "User already
    // registered". /auth/confirm aceita esse link normalmente (verifyOtp aceita
    // qualquer type via query param).
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: target.email,
      options: { redirectTo: `${appUrl}/auth/confirm` },
    })
    if (linkError) throw linkError

    const inviteUrl = `${appUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=recovery`

    await sendEmail({
      to: target.email,
      subject: 'Seu convite para o L Board foi reenviado',
      html: inviteEmailHtml(escapeHtml(target.full_name), inviteUrl),
    })

    auditLog({
      actor_id:        user!.id,
      organization_id: profile.organization_id,
      action:          'team.invite_resent',
      target_id:       id,
      metadata:        { email: target.email },
      ip:              request.headers.get('x-forwarded-for'),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/resend-invite] falha ao reenviar convite:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro ao reenviar convite' }, { status: 400 })
  }
}
