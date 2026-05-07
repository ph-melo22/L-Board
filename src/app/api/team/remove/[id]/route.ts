import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'
import { auditLog } from '@/lib/auditLog'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  if (id === user.id) {
    return NextResponse.json({ error: 'Não é possível remover a própria conta' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: target } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (!target || target.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) throw error

    auditLog({
      actor_id:        user.id,
      organization_id: profile.organization_id,
      action:          'team.member_removed',
      target_id:       id,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao remover usuário' }, { status: 400 })
  }
}
