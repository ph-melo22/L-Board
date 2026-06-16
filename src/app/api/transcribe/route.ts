import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { rateLimit } from '@/lib/rateLimit'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getOpenAIClient(supabase: SupabaseClient): Promise<OpenAI> {
  try {
    const { data: orgKey } = await supabase
      .from('organization_api_keys')
      .select('encrypted_key, iv, auth_tag')
      .eq('provider', 'openai')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (orgKey) {
      const apiKey = decrypt(orgKey.encrypted_key, orgKey.iv, orgKey.auth_tag)
      return new OpenAI({ apiKey })
    }
  } catch { /* fall through */ }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(request: NextRequest) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Apenas founders têm acesso à transcrição' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? user!.id
  if (!rateLimit(`transcribe:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Muitas requisições. Aguarde 1 minuto.' }, { status: 429 })
  }

  const formData = await request.formData()
  const audio = formData.get('audio') as File | null
  if (!audio) {
    return NextResponse.json({ error: 'Arquivo de áudio obrigatório' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const openai = await getOpenAIClient(supabase)

    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'pt',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao transcrever áudio'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
