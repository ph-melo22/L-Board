import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOpenAIClient } from '@/lib/openai'
import { rateLimit } from '@/lib/rateLimit'
import type { SupabaseClient } from '@supabase/supabase-js'

const ALLOWED_ROLES = ['founder', 'manager', 'developer', 'employee']

async function buildLeadContext(supabase: SupabaseClient, lead: Record<string, unknown>): Promise<string> {
  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const [{ data: interactions }, { data: followUps }] = await Promise.all([
    supabase.from('crm_lead_interactions')
      .select('type, content, created_at, profiles!author_id(full_name)')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('tasks')
      .select('id, title, due_date, status')
      .eq('lead_id', lead.id)
      .order('due_date', { ascending: true }),
  ])

  const leadText = [
    `Nome: ${lead.name}`,
    lead.company ? `Empresa: ${lead.company}${lead.role_title ? ` (${lead.role_title})` : ''}` : null,
    lead.email ? `E-mail: ${lead.email}` : null,
    lead.phone ? `Telefone: ${lead.phone}` : null,
    `Estágio atual: ${lead.stage}`,
    lead.source ? `Origem: ${lead.source}` : null,
    lead.product_interest ? `Produto de interesse: ${lead.product_interest}` : null,
    `Valor do negócio: ${fmt(Number(lead.deal_value ?? 0))}`,
    lead.win_probability != null ? `Probabilidade de fechamento: ${lead.win_probability}%` : null,
    lead.expected_close_date ? `Previsão de fechamento: ${lead.expected_close_date}` : null,
    lead.industry ? `Indústria: ${lead.industry}` : null,
    lead.company_size ? `Porte da empresa: ${lead.company_size}` : null,
    `Prioridade: ${lead.priority}`,
    Array.isArray(lead.tags) && lead.tags.length ? `Tags: ${(lead.tags as string[]).join(', ')}` : null,
    lead.next_follow_up_date ? `Próximo follow-up agendado: ${lead.next_follow_up_date}` : 'Sem follow-up agendado',
    lead.notes ? `Notas gerais: ${lead.notes}` : null,
    lead.loss_reason ? `Motivo de perda: ${lead.loss_reason}` : null,
  ].filter(Boolean).join('\n')

  type Interaction = { type: string; content: string; created_at: string; profiles: { full_name: string }[] | null }
  const interactionsText = ((interactions ?? []) as unknown as Interaction[]).map((i) => {
    const authorName = i.profiles?.[0]?.full_name
    return `• [${i.type}] ${i.content}${authorName ? ` — ${authorName}` : ''} (${new Date(i.created_at).toLocaleDateString('pt-BR')})`
  }).join('\n') || 'Nenhuma interação registrada ainda'

  type FollowUp = { id: string; title: string; due_date: string | null; status: string }
  const followUpsText = (followUps as FollowUp[] ?? []).map((t) =>
    `• ${t.title} — ${t.status}${t.due_date ? ` | prazo: ${t.due_date}` : ''} (id: ${t.id})`
  ).join('\n') || 'Nenhum follow-up cadastrado'

  return `=== LEAD ===\n${leadText}\n\n=== HISTÓRICO DE INTERAÇÕES (mais recentes primeiro) ===\n${interactionsText}\n\n=== TAREFAS DE FOLLOW-UP ===\n${followUpsText}`
}

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'mudar_estagio_lead',
      description: 'Move o lead para outro estágio do funil (uso normal, não fecha o negócio)',
      parameters: {
        type: 'object',
        properties: {
          new_stage: { type: 'string', enum: ['novo', 'qualificacao', 'proposta', 'negociacao'] },
        },
        required: ['new_stage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fechar_negocio',
      description: 'Fecha o negócio marcando o lead como Ganho ou Perdido. Use apenas quando o usuário confirmar claramente o resultado final do negócio.',
      parameters: {
        type: 'object',
        properties: {
          resultado: { type: 'string', enum: ['ganho', 'perdido'] },
          loss_reason: { type: 'string', description: 'Motivo da perda (obrigatório se resultado = perdido)' },
        },
        required: ['resultado'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'atualizar_lead',
      description: 'Atualiza um ou mais campos cadastrais do lead. Envie só os campos que devem mudar.',
      parameters: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          role_title: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          source: { type: 'string' },
          product_interest: { type: 'string' },
          deal_value: { type: 'number' },
          win_probability: { type: 'number', description: '0 a 100' },
          expected_close_date: { type: 'string', description: 'YYYY-MM-DD' },
          industry: { type: 'string' },
          company_size: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          tags: { type: 'array', items: { type: 'string' } },
          next_follow_up_date: { type: 'string', description: 'YYYY-MM-DD' },
          notes: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_interacao',
      description: 'Registra uma interação com o lead na timeline (ligação, e-mail, reunião ou nota)',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['note', 'call', 'email', 'meeting'] },
          content: { type: 'string', description: 'Resumo do que aconteceu' },
        },
        required: ['type', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_tarefa_followup',
      description: 'Cria uma tarefa de follow-up para este lead — também aparece no Kanban de Demandas',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          due_date: { type: 'string', description: 'YYYY-MM-DD' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        },
        required: ['title', 'due_date'],
      },
    },
  },
]

async function executeAction(
  leadId: string,
  action: { type: string; params: Record<string, unknown> },
  userId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  async function logInteraction(type: string, content: string) {
    await supabase.from('crm_lead_interactions').insert({ lead_id: leadId, author_id: userId, type, content })
  }

  if (action.type === 'mudar_estagio_lead') {
    const p = action.params as { new_stage: string }
    const { error } = await supabase.from('crm_leads')
      .update({ stage: p.new_stage, updated_at: now, last_interaction_at: now }).eq('id', leadId)
    if (error) return { success: false, message: error.message }
    await logInteraction('stage_change', `Estágio alterado para "${p.new_stage}"`)
    return { success: true, message: `Lead movido para "${p.new_stage}"!` }
  }

  if (action.type === 'fechar_negocio') {
    const p = action.params as { resultado: 'ganho' | 'perdido'; loss_reason?: string }
    const { error } = await supabase.from('crm_leads').update({
      stage: p.resultado,
      loss_reason: p.resultado === 'perdido' ? (p.loss_reason ?? null) : null,
      updated_at: now,
      last_interaction_at: now,
    }).eq('id', leadId)
    if (error) return { success: false, message: error.message }
    await logInteraction('stage_change', `Negócio fechado como "${p.resultado}"${p.loss_reason ? ` — motivo: ${p.loss_reason}` : ''}`)
    return {
      success: true,
      message: p.resultado === 'ganho'
        ? 'Negócio marcado como Ganho! Use o botão "Converter em Cliente" na página do lead para criar o cliente.'
        : 'Negócio marcado como Perdido.',
    }
  }

  if (action.type === 'atualizar_lead') {
    const fields = Object.fromEntries(Object.entries(action.params).filter(([, v]) => v !== undefined))
    if (Object.keys(fields).length === 0) return { success: false, message: 'Nenhum campo para atualizar' }
    const { error } = await supabase.from('crm_leads').update({ ...fields, updated_at: now }).eq('id', leadId)
    if (error) return { success: false, message: error.message }
    await logInteraction('note', `Campos atualizados pela IA: ${Object.keys(fields).join(', ')}`)
    return { success: true, message: 'Lead atualizado com sucesso!' }
  }

  if (action.type === 'registrar_interacao') {
    const p = action.params as { type: string; content: string }
    const { error } = await supabase.from('crm_lead_interactions')
      .insert({ lead_id: leadId, author_id: userId, type: p.type, content: p.content })
    if (error) return { success: false, message: error.message }
    await supabase.from('crm_leads').update({ last_interaction_at: now }).eq('id', leadId)
    return { success: true, message: 'Interação registrada na timeline do lead!' }
  }

  if (action.type === 'criar_tarefa_followup') {
    const p = action.params as { title: string; due_date: string; priority?: string }
    const { error } = await supabase.from('tasks').insert({
      title: p.title,
      due_date: p.due_date,
      priority: p.priority ?? 'medium',
      status: 'todo',
      lead_id: leadId,
      client_id: null,
      squad: null,
      responsible: null,
      description: null,
      impacts_revenue: false,
      revenue_impact_value: null,
    })
    if (error) return { success: false, message: error.message }
    await supabase.from('crm_leads').update({ next_follow_up_date: p.due_date }).eq('id', leadId)
    await logInteraction('note', `Follow-up agendado: "${p.title}" em ${p.due_date}`)
    return { success: true, message: `Follow-up "${p.title}" criado para ${p.due_date}!` }
  }

  return { success: false, message: 'Ação desconhecida' }
}

async function getAuthorizedLead(leadId: string) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return { error: authError } as const
  if (!ALLOWED_ROLES.includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) } as const
  }
  const supabase = await createClient()
  const { data: lead } = await supabase.from('crm_leads').select('*').eq('id', leadId).single()
  if (!lead) {
    return { error: NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 }) } as const
  }
  return { user: user!, profile, supabase, lead } as const
}

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'lead_id é obrigatório' }, { status: 400 })

  const auth = await getAuthorizedLead(leadId)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const { data } = await admin
    .from('crm_lead_messages')
    .select('id, role, content, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
    .limit(100)

  return NextResponse.json(data ?? [])
}

export async function DELETE(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'lead_id é obrigatório' }, { status: 400 })

  const auth = await getAuthorizedLead(leadId)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  await admin.from('crm_lead_messages').delete().eq('lead_id', leadId)
  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    lead_id?: string
    message?: string
    model?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    execute_action?: { type: string; params: Record<string, unknown> }
  }

  if (!body.lead_id) return NextResponse.json({ error: 'lead_id é obrigatório' }, { status: 400 })

  const auth = await getAuthorizedLead(body.lead_id)
  if ('error' in auth) return auth.error
  const { user, supabase, lead } = auth

  const ip = request.headers.get('x-forwarded-for') ?? user.id
  if (!rateLimit(`crm-assistant:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Limite de mensagens atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  if (body.execute_action) {
    const result = await executeAction(lead.id, body.execute_action, user.id)
    return NextResponse.json(result)
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  }

  const model = ['gpt-4o', 'gpt-4o-mini'].includes(body.model ?? '') ? body.model! : 'gpt-4o'

  const [context, openai] = await Promise.all([
    buildLeadContext(supabase, lead),
    getOpenAIClient(supabase),
  ])

  const systemPrompt = `Você é a assistente de CRM do L Board, focada exclusivamente neste lead. Você tem acesso completo aos dados dele e executa ações diretamente através das funções disponíveis.

${context}

Diretrizes de execução:
- Use mudar_estagio_lead para mover entre Novo/Qualificação/Proposta/Negociação — execute direto, sem pedir confirmação
- Use fechar_negocio SOMENTE quando o usuário confirmar claramente que o negócio foi ganho ou perdido — essa ação sempre pede confirmação visual antes de executar, então pode chamá-la quando fizer sentido
- Sempre que o usuário mencionar uma ligação, e-mail, reunião ou qualquer contato com o lead, registre com registrar_interacao
- Sempre que o usuário pedir para agendar, lembrar ou cobrar um follow-up, use criar_tarefa_followup
- Pode chamar múltiplas funções em sequência quando fizer sentido (ex: registrar_interacao + criar_tarefa_followup)
- Responda sempre em português, de forma direta
- Nunca invente dados — use apenas o que está no contexto acima`

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(body.history ?? []).slice(-20) as OpenAI.ChatCompletionMessageParam[],
    { role: 'user', content: body.message },
  ]

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1200,
    })

    const choice = completion.choices[0]
    const usage = completion.usage

    const toolCalls = (choice.message.tool_calls ?? [])
      .filter((tc): tc is OpenAI.ChatCompletionMessageToolCall & { type: 'function' } => tc.type === 'function')
      .map((tc) => ({
        type: tc.function.name,
        params: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }))

    const reply = choice.message.content ?? ''
    const admin = createAdminClient()
    void Promise.resolve(admin.from('crm_lead_messages').insert([
      { lead_id: lead.id, user_id: user.id, role: 'user', content: body.message },
      ...(reply ? [{ lead_id: lead.id, user_id: user.id, role: 'assistant', content: reply }] : []),
    ])).catch(() => {})

    return NextResponse.json({
      reply,
      tool_calls: toolCalls,
      usage: {
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        total_tokens: usage?.total_tokens ?? 0,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
