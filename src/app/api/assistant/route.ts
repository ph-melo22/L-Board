import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/requireAuth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'
import { rateLimit } from '@/lib/rateLimit'
import { listEvents, createEvent, isConnected } from '@/lib/googleCalendar'
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

async function resolveOrgId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  // Try profile first
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()
  if (profile?.organization_id) return profile.organization_id

  // Fallback: derive from any resource the user's RLS policy exposes
  for (const table of ['clients', 'tasks', 'strategic_projects']) {
    const { data } = await supabase.from(table).select('organization_id').limit(1).single()
    if ((data as { organization_id?: string })?.organization_id) {
      return (data as { organization_id: string }).organization_id
    }
  }
  return null
}

async function buildContext(supabase: SupabaseClient, userId: string): Promise<string> {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [
    { data: clients },
    { data: tasks },
    { data: okrs },
    { data: strategicProjects },
    { data: team },
    { data: financialEntries },
    { data: financialExpenses },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, status, monthly_revenue, product').eq('status', 'active'),
    supabase.from('tasks').select('id, title, status, priority, responsible, due_date').neq('status', 'done').order('priority', { ascending: false }),
    supabase.from('okrs').select('*, key_results(*)'),
    supabase.from('strategic_projects').select('*'),
    supabase.from('profiles').select('full_name, role'),
    supabase.from('financial_entries').select('value').gte('date', `${currentMonth}-01`).eq('status', 'confirmed'),
    supabase.from('financial_expenses').select('value').gte('date', `${currentMonth}-01`),
  ])

  const totalRevenue = (financialEntries ?? []).reduce((sum, e) => sum + e.value, 0)
  const totalExpenses = (financialExpenses ?? []).reduce((sum, e) => sum + e.value, 0)
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const clientsText = (clients ?? []).map(c =>
    `• ${c.name} (${c.product}) — ${fmt(c.monthly_revenue)}/mês`
  ).join('\n') || 'Nenhum cliente ativo'

  const tasksText = (tasks ?? []).map(t =>
    `• [${t.priority.toUpperCase()}] ${t.title} — ${t.status}${t.responsible ? ` | resp: ${t.responsible}` : ''}${t.due_date ? ` | prazo: ${t.due_date}` : ''} (id: ${t.id})`
  ).join('\n') || 'Nenhuma demanda em aberto'

  const okrsText = (okrs ?? []).map((o: { objective: string; status: string; quarter: string; key_results: { description: string; current: number; target: number; unit: string }[] }) => {
    const krs = o.key_results.map(kr => `  - ${kr.description}: ${kr.current}/${kr.target}${kr.unit}`).join('\n')
    return `• ${o.objective} [${o.status}] ${o.quarter}\n${krs}`
  }).join('\n') || 'Nenhum OKR cadastrado'

  const projectsText = (strategicProjects ?? []).map((p: { title: string; status: string; priority: string; due_date?: string }) =>
    `• ${p.title} [${p.status}/${p.priority}]${p.due_date ? ` — prazo: ${p.due_date}` : ''}`
  ).join('\n') || 'Nenhum projeto estratégico'

  const teamText = (team ?? []).map((m: { full_name: string; role: string }) =>
    `• ${m.full_name} (${m.role})`
  ).join('\n') || 'Nenhum membro'

  // Google Calendar events (if connected)
  let calendarText = ''
  try {
    const connected = await isConnected(userId)
    if (connected) {
      const events = await listEvents(userId, 7)
      if (events.length > 0) {
        calendarText = events.map(e => {
          const start = new Date(e.start).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          return `• ${e.title} — ${start}${e.location ? ` | local: ${e.location}` : ''}${e.attendees?.length ? ` | participantes: ${e.attendees.join(', ')}` : ''}`
        }).join('\n')
      } else {
        calendarText = 'Nenhum compromisso nos próximos 7 dias'
      }
    }
  } catch { /* Google Calendar não disponível */ }

  const calendarSection = calendarText
    ? `\n=== AGENDA — PRÓXIMOS 7 DIAS ===\n${calendarText}`
    : ''

  return `Data de hoje: ${now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

=== CLIENTES ATIVOS (${(clients ?? []).length}) ===
${clientsText}

=== DEMANDAS EM ABERTO (${(tasks ?? []).length}) ===
${tasksText}

=== OKRs ===
${okrsText}

=== PROJETOS ESTRATÉGICOS ===
${projectsText}

=== EQUIPE ===
${teamText}

=== FINANCEIRO — MÊS ATUAL ===
Receita confirmada: ${fmt(totalRevenue)}
Despesas: ${fmt(totalExpenses)}
Resultado: ${fmt(totalRevenue - totalExpenses)}${calendarSection}`
}

const TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'criar_demanda',
      description: 'Cria uma nova demanda/tarefa no kanban de demandas da organização',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título da demanda (máx 100 chars)' },
          description: { type: 'string', description: 'Descrição detalhada' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          responsible: { type: 'string', description: 'Nome do responsável' },
          due_date: { type: 'string', description: 'Prazo no formato YYYY-MM-DD' },
        },
        required: ['title', 'priority'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'atualizar_status_demanda',
      description: 'Atualiza o status de uma demanda existente',
      parameters: {
        type: 'object',
        properties: {
          demand_id: { type: 'string', description: 'ID da demanda (UUID)' },
          demand_title: { type: 'string', description: 'Título da demanda para confirmação' },
          new_status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'review', 'done'] },
        },
        required: ['demand_id', 'demand_title', 'new_status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_projeto_estrategico',
      description: 'Cria um novo projeto estratégico no Founder Board',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          status: { type: 'string', enum: ['planning', 'active'] },
          due_date: { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['title', 'priority', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_evento_calendario',
      description: 'Cria um novo evento no Google Calendar do founder',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título do evento' },
          description: { type: 'string', description: 'Descrição ou pauta' },
          start: { type: 'string', description: 'Data e hora de início no formato ISO 8601 (ex: 2026-06-20T10:00:00)' },
          end: { type: 'string', description: 'Data e hora de término no formato ISO 8601 (ex: 2026-06-20T11:00:00)' },
          attendees: { type: 'array', items: { type: 'string' }, description: 'Lista de e-mails dos participantes' },
        },
        required: ['title', 'start', 'end'],
      },
    },
  },
]

async function executeAction(
  action: { type: string; params: Record<string, unknown> },
  orgId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient()

  if (action.type === 'criar_demanda') {
    const p = action.params as {
      title: string; description?: string; priority: string
      responsible?: string; due_date?: string
    }
    const { error } = await supabase.from('tasks').insert({
      organization_id: orgId,
      title: p.title,
      description: p.description ?? null,
      priority: p.priority,
      status: 'todo',
      responsible: p.responsible ?? null,
      due_date: p.due_date ?? null,
      squad: null,
      client_id: null,
      impacts_revenue: false,
      revenue_impact_value: null,
    })
    if (error) return { success: false, message: error.message }
    return { success: true, message: `Demanda "${p.title}" criada com sucesso!` }
  }

  if (action.type === 'atualizar_status_demanda') {
    const p = action.params as { demand_id: string; demand_title: string; new_status: string }
    const { error } = await supabase.from('tasks').update({ status: p.new_status })
      .eq('id', p.demand_id).eq('organization_id', orgId)
    if (error) return { success: false, message: error.message }
    return { success: true, message: `"${p.demand_title}" movida para ${p.new_status}!` }
  }

  if (action.type === 'criar_projeto_estrategico') {
    const p = action.params as {
      title: string; description?: string; priority: string
      status: string; due_date?: string
    }
    const { error } = await supabase.from('strategic_projects').insert({
      organization_id: orgId,
      title: p.title,
      description: p.description ?? null,
      priority: p.priority,
      status: p.status,
      due_date: p.due_date ?? null,
    })
    if (error) return { success: false, message: error.message }
    return { success: true, message: `Projeto "${p.title}" criado com sucesso!` }
  }

  if (action.type === 'criar_evento_calendario') {
    const p = action.params as {
      title: string; description?: string; start: string; end: string; attendees?: string[]
    }
    try {
      await createEvent(userId, {
        title: p.title,
        description: p.description,
        start: p.start,
        end: p.end,
        attendees: p.attendees,
      })
      return { success: true, message: `Evento "${p.title}" criado no Google Calendar!` }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Erro ao criar evento' }
    }
  }

  return { success: false, message: 'Ação desconhecida' }
}

export async function POST(request: NextRequest) {
  const { user, profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Apenas founders têm acesso à Secretária' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? user!.id
  if (!rateLimit(`assistant:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Limite de mensagens atingido. Aguarde 1 minuto.' }, { status: 429 })
  }

  // Server client: uses user JWT + RLS — works regardless of profile.organization_id
  const supabase = await createClient()

  const body = await request.json() as {
    message?: string
    model: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
    execute_action?: { type: string; params: Record<string, unknown> }
  }

  if (body.execute_action) {
    // For mutations, resolve org_id from multiple sources
    const orgId = profile.organization_id ?? await resolveOrgId(supabase, user!.id)
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Não foi possível identificar a organização para executar a ação.' })
    }
    const result = await executeAction(body.execute_action, orgId, user!.id)
    return NextResponse.json(result)
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
  }

  const model = ['gpt-4o', 'gpt-4o-mini'].includes(body.model) ? body.model : 'gpt-4o'

  const [context, openai] = await Promise.all([
    buildContext(supabase, user!.id),
    getOpenAIClient(supabase),
  ])

  const systemPrompt = `Você é Layla, assistente executiva pessoal do gestor da organização. Você tem acesso completo aos dados operacionais em tempo real.

${context}

Diretrizes:
- Responda sempre em português, de forma direta e executiva
- Quando for criar demandas, projetos ou atualizar status, use as funções disponíveis — o sistema pedirá confirmação antes de executar
- Use markdown (listas, negrito) quando ajudar na clareza
- Seja proativa: analise os dados e sugira ações concretas quando relevante
- Nunca invente dados — use apenas o que está no contexto acima`

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...body.history.slice(-20) as OpenAI.ChatCompletionMessageParam[],
    { role: 'user', content: body.message },
  ]

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1500,
    })

    const choice = completion.choices[0]
    const usage = completion.usage

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls = (choice.message.tool_calls ?? []).filter(tc => tc.type === 'function').map((tc: any) => ({
      type: tc.function.name as string,
      params: JSON.parse(tc.function.arguments as string) as Record<string, unknown>,
    }))

    return NextResponse.json({
      reply: choice.message.content ?? '',
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
