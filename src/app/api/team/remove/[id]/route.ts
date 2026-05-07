import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  if (params.id === user.id) {
    return NextResponse.json({ error: 'Não é possível remover a própria conta' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: target } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', params.id)
      .single()

    if (!target || target.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const { error } = await supabase.auth.admin.deleteUser(params.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao remover usuário' }, { status: 400 })
  }
}
