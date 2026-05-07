import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'

async function verifyKeyOwnership(keyId: string, organizationId: string | null) {
  const supabase = createAdminClient()
  const { data: key } = await supabase
    .from('client_api_keys')
    .select('client_id')
    .eq('id', keyId)
    .single()

  if (!key) return false

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', key.client_id)
    .eq('organization_id', organizationId)
    .single()

  return !!client
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  try {
    const owned = await verifyKeyOwnership(id, profile.organization_id)
    if (!owned) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const body = await request.json()
    const allowed: Record<string, unknown> = {}
    if ('label' in body) allowed.label = body.label
    if ('is_active' in body) allowed.is_active = body.is_active

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('client_api_keys')
      .update({ ...allowed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, client_id, provider, label, key_hint, is_active, created_at, updated_at')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar chave' }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  try {
    const owned = await verifyKeyOwnership(id, profile.organization_id)
    if (!owned) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('client_api_keys')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao remover chave' }, { status: 400 })
  }
}
