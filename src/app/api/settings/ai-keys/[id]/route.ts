import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'
import { auditLog } from '@/lib/auditLog'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'founder') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const updates = await request.json()
  const allowed: Record<string, unknown> = {}
  if (typeof updates.is_active === 'boolean') allowed.is_active = updates.is_active
  if (typeof updates.label === 'string') allowed.label = updates.label || null

  const { data, error } = await supabase
    .from('organization_api_keys')
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .select('id, provider, label, key_hint, is_active, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError
  void request

  const { id } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'founder') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { error } = await supabase
    .from('organization_api_keys')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  auditLog({
    actor_id:        user!.id,
    organization_id: profile!.organization_id,
    action:          'org_api_key.deleted',
    target_id:       id,
  })

  return NextResponse.json({ success: true })
}
