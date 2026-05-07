import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'
import { rateLimit } from '@/lib/rateLimit'
import { auditLog } from '@/lib/auditLog'
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY
  if (!k || k.length !== 64) throw new Error('ENCRYPTION_KEY inválida ou ausente')
  return Buffer.from(k, 'hex')
}

function encrypt(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return {
    encrypted_key: encrypted,
    iv: iv.toString('hex'),
    auth_tag: cipher.getAuthTag().toString('hex'),
  }
}

export async function GET(request: NextRequest) {
  const { profile, error: authError } = await requireAuth()
  if (authError) return authError

  try {
    const client_id = request.nextUrl.searchParams.get('client_id')
    if (!client_id) return NextResponse.json({ error: 'client_id obrigatório' }, { status: 400 })

    const supabase = createAdminClient()

    // Verify the client belongs to caller's organization
    const { data: clientCheck } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!clientCheck) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('client_api_keys')
      .select('id, client_id, provider, label, key_hint, is_active, created_at, updated_at')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar chaves' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  const ip = request.headers.get('x-forwarded-for') ?? user.id
  if (!rateLimit(`api-keys:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Muitas requisições. Tente novamente em instantes.' }, { status: 429 })
  }

  try {
    const { client_id, provider, label, api_key } = await request.json()

    if (!client_id || !provider || !api_key) {
      return NextResponse.json({ error: 'client_id, provider e api_key são obrigatórios' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the client belongs to caller's organization
    const { data: clientCheck } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!clientCheck) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const { encrypted_key, iv, auth_tag } = encrypt(api_key)
    const key_hint = String(api_key).slice(-4)

    const { data, error } = await supabase
      .from('client_api_keys')
      .insert({ client_id, provider, label: label || null, encrypted_key, iv, auth_tag, key_hint })
      .select('id, client_id, provider, label, key_hint, is_active, created_at, updated_at')
      .single()

    if (error) throw error

    auditLog({
      actor_id:        user.id,
      organization_id: profile.organization_id,
      action:          'client_api_key.created',
      target_id:       client_id,
      metadata:        { provider, key_id: data!.id },
      ip:              request.headers.get('x-forwarded-for'),
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar chave' }, { status: 400 })
  }
}
