import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  try {
    const client_id = request.nextUrl.searchParams.get('client_id')
    if (!client_id) return NextResponse.json({ error: 'client_id obrigatório' }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('client_api_keys')
      .select('id, client_id, provider, label, key_hint, is_active, created_at, updated_at')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client_id, provider, label, api_key } = await request.json()

    if (!client_id || !provider || !api_key) {
      return NextResponse.json({ error: 'client_id, provider e api_key são obrigatórios' }, { status: 400 })
    }

    const { encrypted_key, iv, auth_tag } = encrypt(api_key)
    const key_hint = String(api_key).slice(-4)

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('client_api_keys')
      .insert({ client_id, provider, label: label || null, encrypted_key, iv, auth_tag, key_hint })
      .select('id, client_id, provider, label, key_hint, is_active, created_at, updated_at')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
