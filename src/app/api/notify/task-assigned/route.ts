import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false, reason: 'no_key' })

  try {
    const { assigneeName, assigneeEmail, taskTitle, projectTitle, taskType } = await request.json()

    const label = taskType === 'subtask' ? 'sub-atividade' : 'atividade'

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #f9f9f9; border-radius: 12px; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 20px;">Nova ${label} atribuída a você</h2>
          <p style="color: #666; margin: 0 0 24px; font-size: 14px;">Projeto: <strong>${projectTitle}</strong></p>

          <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 15px; font-weight: 600;">${taskTitle}</p>
          </div>

          <p style="font-size: 14px; color: #444; margin: 0 0 24px;">
            Olá, <strong>${assigneeName}</strong>! Acesse o L Board para ver os detalhes e marcar como concluída quando finalizar.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0 0 16px;" />
          <p style="font-size: 12px; color: #999; margin: 0;">L Board · Hub Operacional</p>
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'L Board <onboarding@resend.dev>',
        to: [assigneeEmail],
        subject: `Nova ${label}: ${taskTitle} — ${projectTitle}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({ ok: false, reason: (err as { message?: string }).message ?? 'resend_error' })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, reason: 'internal_error' })
  }
}
