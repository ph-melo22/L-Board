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
    { data: projects },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, status, monthly_revenue, product').eq('status', 'active'),
    supabase.from('tasks').select('id, title, status, priority, responsible, due_date').neq('status', 'done').order('priority', { ascending: false }),
    supabase.from('okrs').select('*, key_results(*)'),
    supabase.from('strategic_projects').select('*'),
    supabase.from('profiles').select('full_name, role'),
    supabase.from('financial_entries').select('value').gte('date', `${currentMonth}-01`).eq('status', 'confirmed'),
    supabase.from('financial_expenses').select('value').gte('date', `${currentMonth}-01`),
    supabase.from('projects').select('id, title, status, priority, end_date, project_tasks(id, title, completed, due_date, description)').neq('status', 'completed').order('created_at', { ascending: false }),
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

  type ProjectTask = { id: string; title: string; completed: boolean; due_date: string | null; description: string | null }
  type ProjectRow = { id: string; title: string; status: string; priority: string; end_date: string | null; project_tasks: ProjectTask[] }
  const projectsWithTasksText = (projects as ProjectRow[] ?? []).map(p => {
    const pending = (p.project_tasks ?? []).filter(t => !t.completed)
    const taskLines = pending.length
      ? pending.map(t => `  ↳ [atividade] ${t.title}${t.due_date ? ` | prazo: ${t.due_date}` : ''} (id: ${t.id})`).join('\n')
      : '  (sem atividades pendentes)'
    return `• ${p.title} [${p.status}/${p.priority}]${p.end_date ? ` — entrega: ${p.end_date}` : ''} (id: ${p.id})\n${taskLines}`
  }).join('\n\n') || 'Nenhum projeto ativo'

  const teamText = (team ?? []).map((m: { full_name: string; role: string }) =>
    `• ${m.full_name} (${m.role})`
  ).join('\n') || 'Nenhum membro'

  // Google Calendar events (if connected)
  let calendarText = ''
  try {
    const connected = await isConnected(userId)
    if (connected) {
      const events = await listEvents(userId, 14)
      if (events.length > 0) {
        calendarText = events.map(e => {
          const isAllDay = !e.start.includes('T')
          let startStr: string
          if (isAllDay) {
            // All-day events: parse as local date to avoid UTC offset shifting the day
            const [y, m, d] = e.start.split('-').map(Number)
            startStr = new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
            }) + ' (dia inteiro)'
          } else {
            startStr = new Date(e.start).toLocaleString('pt-BR', {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'America/Sao_Paulo',
            })
          }
          const endStr = e.end && !isAllDay
            ? ' até ' + new Date(e.end).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
            : ''
          return `• ${e.title} — ${startStr}${endStr}${e.location ? ` | local: ${e.location}` : ''}${e.attendees?.length ? ` | participantes: ${e.attendees.join(', ')}` : ''}`
        }).join('\n')
      } else {
        calendarText = 'Nenhum compromisso nos próximos 14 dias'
      }
    }
  } catch { /* Google Calendar não disponível */ }

  const calendarSection = calendarText
    ? `\n=== AGENDA — PRÓXIMOS 14 DIAS ===\n${calendarText}`
    : ''

  return `Data de hoje: ${now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Sao_Paulo' })} | Horário atual em Brasília: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}

=== CLIENTES ATIVOS (${(clients ?? []).length}) ===
${clientsText}

=== DEMANDAS EM ABERTO (${(tasks ?? []).length}) ===
${tasksText}

=== OKRs ===
${okrsText}

=== PROJETOS ESTRATÉGICOS ===
${projectsText}

=== PROJETOS ATIVOS COM ATIVIDADES PENDENTES ===
${projectsWithTasksText}

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
      name: 'atualizar_prazo_demanda',
      description: 'Define ou atualiza a data de prazo de uma demanda existente no Kanban',
      parameters: {
        type: 'object',
        properties: {
          demand_id: { type: 'string', description: 'ID da demanda (UUID)' },
          demand_title: { type: 'string', description: 'Título da demanda para confirmação' },
          due_date: { type: 'string', description: 'Nova data de prazo no formato YYYY-MM-DD' },
        },
        required: ['demand_id', 'demand_title', 'due_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sincronizar_demanda_calendario',
      description: 'Cria um evento no Google Calendar para o prazo de entrega de uma demanda do Kanban',
      parameters: {
        type: 'object',
        properties: {
          demand_title: { type: 'string', description: 'Título da demanda' },
          due_date: { type: 'string', description: 'Data de prazo no formato YYYY-MM-DD' },
          start_time: { type: 'string', description: 'Horário de início no formato HH:MM (padrão: 09:00)' },
          duration_hours: { type: 'number', description: 'Duração em horas (padrão: 1)' },
        },
        required: ['demand_title', 'due_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'marcar_atividade_projeto_concluida',
      description: 'Marca uma atividade de projeto como concluída',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'ID da atividade do projeto (UUID)' },
          task_title: { type: 'string', description: 'Título da atividade para confirmação' },
          project_title: { type: 'string', description: 'Título do projeto ao qual a atividade pertence' },
        },
        required: ['task_id', 'task_title', 'project_title'],
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

  if (action.type === 'atualizar_prazo_demanda') {
    const p = action.params as { demand_id: string; demand_title: string; due_date: string }
    const { error } = await supabase.from('tasks').update({ due_date: p.due_date })
      .eq('id', p.demand_id).eq('organization_id', orgId)
    if (error) return { success: false, message: error.message }
    return { success: true, message: `Prazo de "${p.demand_title}" atualizado para ${p.due_date}!` }
  }

  if (action.type === 'sincronizar_demanda_calendario') {
    const p = action.params as { demand_title: string; due_date: string; start_time?: string; duration_hours?: number }
    const startTime = p.start_time ?? '09:00'
    const duration = p.duration_hours ?? 1
    const start = `${p.due_date}T${startTime}:00`
    const endDate = new Date(`${p.due_date}T${startTime}:00`)
    endDate.setHours(endDate.getHours() + duration)
    const end = endDate.toISOString().slice(0, 16)
    try {
      await createEvent(userId, {
        title: `⚡ Prazo: ${p.demand_title}`,
        description: `Prazo de entrega da demanda "${p.demand_title}" no L Board.`,
        start,
        end,
      })
      return { success: true, message: `Evento de prazo para "${p.demand_title}" criado no Google Calendar em ${p.due_date}!` }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Erro ao criar evento' }
    }
  }

  if (action.type === 'marcar_atividade_projeto_concluida') {
    const p = action.params as { task_id: string; task_title: string; project_title: string }
    const { error } = await supabase.from('project_tasks').update({ completed: true }).eq('id', p.task_id)
    if (error) return { success: false, message: error.message }
    return { success: true, message: `Atividade "${p.task_title}" do projeto "${p.project_title}" marcada como concluída!` }
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

export async function GET() {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('assistant_chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })
    .limit(100)

  return NextResponse.json(data ?? [])
}

export async function DELETE() {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = createAdminClient()
  await supabase.from('assistant_chat_messages').delete().eq('user_id', user!.id)
  return NextResponse.json({ success: true })
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

  const systemPrompt = `Você é Layla, assistente executiva pessoal do gestor da organização. Você tem acesso completo aos dados operacionais em tempo real e executa ações diretamente — sem aguardar confirmação.

${context}

Diretrizes de execução:
- Execute as ações imediatamente usando as funções disponíveis — não peça confirmação, não pergunte se deve executar
- Sempre que criar ou atualizar uma demanda com prazo (due_date), chame TAMBÉM sincronizar_demanda_calendario para criar o evento no Google Calendar automaticamente
- Sempre que colocar atividades de projetos no Kanban, defina o prazo e sincronize com o calendário na mesma sequência
- Pode chamar múltiplas funções em sequência para completar uma tarefa (ex: criar_demanda + atualizar_prazo_demanda + sincronizar_demanda_calendario)
- Responda sempre em português, de forma direta e executiva
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

    // Save messages to history (fire-and-forget)
    const reply = choice.message.content ?? ''
    const adminDb = createAdminClient()
    void Promise.resolve(adminDb.from('assistant_chat_messages').insert([
      { user_id: user!.id, role: 'user', content: body.message },
      ...(reply ? [{ user_id: user!.id, role: 'assistant', content: reply }] : []),
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
