import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'
import { rateLimit } from '@/lib/rateLimit'
import { encrypt } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError
  void request

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json([])
  }

  const { data, error } = await supabase
    .from('organization_api_keys')
    .select('id, organization_id, provider, label, key_hint, is_active, created_at, updated_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const ip = request.headers.get('x-forwarded-for') ?? user!.id
  if (!rateLimit(`settings-ai-keys:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde 1 minuto.' }, { status: 429 })
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'founder') {
    return NextResponse.json({ error: 'Apenas founders podem gerenciar chaves de IA' }, { status: 403 })
  }
  if (!profile.organization_id) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const { provider, label, api_key } = await request.json()
  if (!provider || !api_key) {
    return NextResponse.json({ error: 'provider e api_key são obrigatórios' }, { status: 400 })
  }

  const { encrypted_key, iv, auth_tag } = encrypt(api_key)
  const key_hint = String(api_key).slice(-4)

  const { data, error } = await supabase
    .from('organization_api_keys')
    .insert({
      organization_id: profile.organization_id,
      provider,
      label: label || null,
      encrypted_key,
      iv,
      auth_tag,
      key_hint,
    })
    .select('id, organization_id, provider, label, key_hint, is_active, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
