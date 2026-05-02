import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface AITask {
  title: string
  description: string
  subtasks: { title: string }[]
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const membersRaw = formData.get('members') as string | null

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Envie um arquivo PDF válido.' }, { status: 400 })
    }

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfMod = await import('pdf-parse') as any
    const pdfParse = pdfMod.default ?? pdfMod
    const parsed = await pdfParse(buffer)
    const text = parsed.text?.trim()

    if (!text || text.length < 20) {
      return NextResponse.json({ error: 'Não foi possível extrair texto do PDF. O arquivo pode ser uma imagem ou estar protegido.' }, { status: 422 })
    }

    // Truncate to avoid token limit (~12k chars ≈ ~3k tokens, leaving room for response)
    const truncated = text.slice(0, 12000)

    const membersContext = membersRaw
      ? `\n\nMembros disponíveis para delegação: ${membersRaw}. Quando o documento mencionar explicitamente uma pessoa ou papel que corresponda a um membro, preencha "assigned_to_hint" com o nome exato do membro.`
      : ''

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um gerente de projetos experiente. Analise documentos e extraia tarefas acionáveis de forma estruturada. Responda APENAS com JSON válido, sem texto adicional.`,
        },
        {
          role: 'user',
          content: `Analise o documento abaixo e extraia todas as tarefas e sub-tarefas que precisam ser executadas.${membersContext}

Retorne EXATAMENTE neste formato JSON:
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
- Títulos em português, imperativos (ex: "Criar wireframes", "Revisar contrato")

Documento:
---
${truncated}
---`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed2 = JSON.parse(raw) as { tasks: AITask[] }

    if (!Array.isArray(parsed2.tasks)) {
      return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 500 })
    }

    return NextResponse.json({ tasks: parsed2.tasks })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
