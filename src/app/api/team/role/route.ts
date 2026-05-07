import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'

const VALID_ROLES = ['founder', 'manager', 'financial', 'developer', 'employee']

export async function PATCH(request: NextRequest) {
  const { profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  try {
    const { id, role } = await request.json()

    if (!id || !role) {
      return NextResponse.json({ error: 'id e role são obrigatórios' }, { status: 400 })
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: target } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (!target || target.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar permissão' }, { status: 400 })
  }
}
