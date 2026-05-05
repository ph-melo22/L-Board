import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const INVITE_HTML = (name: string, inviteUrl: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  body{margin:0;padding:40px 16px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  .card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden}
  .top{background:#0f172a;padding:24px 32px;display:flex;align-items:center;gap:10px}
  .top h1{color:#fff;margin:0;font-size:18px;font-weight:700;letter-spacing:-.3px}
  .top span{color:#64748b;font-size:12px;font-weight:500;margin-left:auto}
  .body{padding:32px}
  p{color:#374151;font-size:15px;line-height:1.65;margin:0 0 20px}
  .btn{display:inline-block;background:#0f172a;color:#fff!important;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600}
  hr{border:none;border-top:1px solid #f4f4f5;margin:24px 0}
  .small{color:#9ca3af;font-size:12px;line-height:1.5;word-break:break-all}
  .footer{padding:0 32px 28px;color:#9ca3af;font-size:12px;line-height:1.5}
</style>
</head>
<body>
<div class="card">
  <div class="top">
    <h1>L Board</h1>
    <span>Hub Operacional</span>
  </div>
  <div class="body">
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Você foi adicionado à equipe do <strong>L Board</strong>. Clique no botão abaixo para definir sua senha e acessar a plataforma.</p>
    <a href="${inviteUrl}" class="btn">Aceitar convite →</a>
    <hr/>
    <p class="small">Se o botão não funcionar, copie e cole este link no navegador:<br/><a href="${inviteUrl}" style="color:#6b7280">${inviteUrl}</a></p>
  </div>
  <div class="footer">
    Este convite expira em 24 horas. Se você não esperava receber este e-mail, pode ignorá-lo.
  </div>
</div>
</body>
</html>`

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, role } = await request.json()

    if (!email || !full_name) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const appUrl = request.nextUrl.origin

    // Gera o link de convite sem enviar e-mail pelo Supabase
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    })
    if (linkError) throw linkError

    // Cria o perfil com o role correto
    const { error: profileError } = await supabase.from('profiles').insert({
      id: linkData.user.id,
      email,
      full_name,
      role: role ?? 'employee',
    })
    if (profileError) throw profileError

    // Envia o e-mail via Resend diretamente
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) throw new Error('RESEND_API_KEY não configurada')

    const inviteUrl = linkData.properties.action_link

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'L Board <noreply@lboard.com.br>',
        to: email,
        subject: 'Você foi convidado para o L Board',
        html: INVITE_HTML(full_name, inviteUrl),
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      throw new Error(err.message ?? 'Erro ao enviar e-mail')
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
