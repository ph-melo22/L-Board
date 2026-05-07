import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/requireAuth'
import { rateLimit } from '@/lib/rateLimit'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

const MAX_BYTES = 300 * 1024 * 1024 // 300 MB

async function getOpenAIClient(userId: string): Promise<OpenAI> {
  try {
    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (profile?.organization_id) {
      const { data: orgKey } = await supabase
        .from('organization_api_keys')
        .select('encrypted_key, iv, auth_tag')
        .eq('organization_id', profile.organization_id)
        .eq('provider', 'openai')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (orgKey) {
        const apiKey = decrypt(orgKey.encrypted_key, orgKey.iv, orgKey.auth_tag)
        return new OpenAI({ apiKey })
      }
    }
  } catch {
    // Fall through to env var
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export interface AITask {
  title: string
  description: string
  subtasks: { title: string }[]
}

async function extractContent(file: File): Promise<
  | { kind: 'text'; text: string }
  | { kind: 'image'; base64: string; mimeType: string }
> {
  const mime = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfMod = await import('pdf-parse') as any
    const pdfParse = pdfMod.default ?? pdfMod
    try {
      const parsed = await pdfParse(buffer, { max: 0 })
      return { kind: 'text', text: parsed.text?.trim() ?? '' }
    } catch (pdfErr) {
      const msg = pdfErr instanceof Error ? pdfErr.message : ''
      throw new Error(
        `Não foi possível ler este PDF (${msg}). O arquivo pode estar corrompido ou ter sido gerado por software não padrão. Tente converter para imagem (JPG/PNG) ou exportar novamente como PDF.`
      )
    }
  }

  // ── DOCX / DOC ────────────────────────────────────────────────────────────
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    name.endsWith('.docx') || name.endsWith('.doc')
  ) {
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mammoth = await import('mammoth') as any
    const result = await mammoth.extractRawText({ buffer })
    return { kind: 'text', text: result.value?.trim() ?? '' }
  }

  // ── Images → GPT-4o vision ────────────────────────────────────────────────
  if (mime.startsWith('image/')) {
    const buffer = Buffer.from(await file.arrayBuffer())
    return { kind: 'image', base64: buffer.toString('base64'), mimeType: mime }
  }

  // ── Everything else: try as UTF-8 text (txt, csv, md, json, xml, html…) ──
  const buffer = Buffer.from(await file.arrayBuffer())
  return { kind: 'text', text: buffer.toString('utf-8').trim() }
}

const SYSTEM_PROMPT =
  'Você é um gerente de projetos experiente. Analise documentos e extraia tarefas acionáveis de forma estruturada. Responda APENAS com JSON válido, sem texto adicional.'

const TASK_FORMAT = `Retorne EXATAMENTE neste formato JSON:
{
  "tasks": [
    {
      "title": "título conciso da tarefa (máx 80 caracteres)",
      "description": "contexto breve em 1-2 frases",
      "assigned_to_hint": "nome do membro ou null",
      "subtasks": [
        {
          "title": "título da sub-tarefa (máx 60 caracteres)",
          "assigned_to_hint": "nome do membro ou null"
        }
      ]
    }
  ]
}

Regras:
- Máximo 25 tarefas
- Subtarefas apenas quando a tarefa tiver passos claros
- Foco em ações concretas, não em contexto ou descrição do documento
- Títulos em português, imperativos (ex: "Criar wireframes", "Revisar contrato")`

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  // Verify the project belongs to caller's organization
  const supabaseCheck = createAdminClient()
  const { data: project } = await supabaseCheck
    .from('projects')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

  const ip = request.headers.get('x-forwarded-for') ?? user!.id
  if (!rateLimit(`ai-tasks:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Limite de análises via IA atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const membersRaw = formData.get('members') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande. O limite é 300 MB.' }, { status: 400 })
    }

    const membersCtx = membersRaw
      ? `\n\nMembros disponíveis para delegação: ${membersRaw}. Quando o documento mencionar explicitamente uma pessoa ou papel que corresponda a um membro, preencha "assigned_to_hint" com o nome exato do membro.`
      : ''

    const content = await extractContent(file)
    const openai = await getOpenAIClient(user!.id)

    let completion: Awaited<ReturnType<typeof openai.chat.completions.create>>

    if (content.kind === 'image') {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${content.mimeType};base64,${content.base64}` } },
              { type: 'text', text: `Analise a imagem e extraia todas as tarefas e sub-tarefas que precisam ser executadas.${membersCtx}\n\n${TASK_FORMAT}` },
            ],
          },
        ],
      })
    } else {
      if (!content.text || content.text.length < 20) {
        return NextResponse.json(
          { error: 'Não foi possível extrair texto do arquivo. Verifique se o arquivo tem conteúdo legível.' },
          { status: 422 }
        )
      }

      const truncated = content.text.slice(0, 12000)

      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analise o documento abaixo e extraia todas as tarefas e sub-tarefas que precisam ser executadas.${membersCtx}\n\n${TASK_FORMAT}\n\nDocumento:\n---\n${truncated}\n---`,
          },
        ],
      })
    }

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as { tasks: AITask[] }

    if (!Array.isArray(parsed.tasks)) {
      return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 500 })
    }

    return NextResponse.json({ tasks: parsed.tasks })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
