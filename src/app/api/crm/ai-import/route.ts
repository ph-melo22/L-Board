import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'
import { getOpenAIClient } from '@/lib/openai'
import { extractContent } from '@/lib/fileExtract'

const ALLOWED_ROLES = ['founder', 'manager', 'developer', 'employee']
const MAX_BYTES = 300 * 1024 * 1024 // 300 MB

export interface AILead {
  name: string
  company?: string
  role_title?: string
  email?: string
  phone?: string
  source?: string
  product_interest?: string
  deal_value?: number
  industry?: string
  company_size?: string
  notes?: string
}

const SYSTEM_PROMPT =
  'Você é um assistente de CRM. Analise listas de contatos/leads (planilhas CSV, texto livre, tabelas em PDF/imagem) e extraia cada lead de forma estruturada. Responda APENAS com JSON válido, sem texto adicional.'

const LEAD_FORMAT = `Retorne EXATAMENTE neste formato JSON:
{
  "leads": [
    {
      "name": "nome do contato (obrigatório)",
      "company": "empresa ou null",
      "role_title": "cargo ou null",
      "email": "e-mail ou null",
      "phone": "telefone ou null",
      "source": "origem, se identificável (ex: planilha, evento, indicação) ou null",
      "product_interest": "produto/serviço de interesse ou null",
      "deal_value": "valor do negócio em número (sem símbolo de moeda) ou null",
      "industry": "indústria/segmento ou null",
      "company_size": "porte da empresa ou null",
      "notes": "qualquer outra informação relevante da linha original ou null"
    }
  ]
}

Regras:
- Máximo 200 leads
- Um lead por linha/contato — nunca invente dados que não estejam na fonte
- Se a fonte for uma planilha, mapeie as colunas para os campos mais parecidos (ex: "Empresa" → company, "Valor" → deal_value)
- Ignore linhas de cabeçalho, totais ou vazias
- "name" é obrigatório — pule linhas sem nome identificável`

export async function POST(request: NextRequest) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (!ALLOWED_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? user!.id
  if (!rateLimit(`crm-ai-import:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Limite de importações via IA atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande. O limite é 300 MB.' }, { status: 400 })
    }

    const content = await extractContent(file)
    const supabase = await createClient()
    const openai = await getOpenAIClient(supabase)

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
              { type: 'text', text: `Analise a imagem e extraia todos os leads/contatos listados.\n\n${LEAD_FORMAT}` },
            ],
          },
        ],
      })
    } else {
      if (!content.text || content.text.length < 5) {
        return NextResponse.json(
          { error: 'Não foi possível extrair texto do arquivo. Verifique se o arquivo tem conteúdo legível.' },
          { status: 422 }
        )
      }

      const truncated = content.text.slice(0, 30000)

      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analise a lista abaixo e extraia todos os leads/contatos.\n\n${LEAD_FORMAT}\n\nLista:\n---\n${truncated}\n---`,
          },
        ],
      })
    }

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as { leads: AILead[] }

    if (!Array.isArray(parsed.leads)) {
      return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 500 })
    }

    return NextResponse.json({ leads: parsed.leads.filter((l) => l.name?.trim()) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
