'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Data ─────────────────────────────────────────────────────────────────────

const VERSION = '0.1.0 beta'
const STACK = [
  { name: 'Next.js 14', role: 'Framework React (App Router)' },
  { name: 'TypeScript', role: 'Tipagem estática' },
  { name: 'Supabase', role: 'Banco de dados (PostgreSQL) + Auth' },
  { name: 'Tailwind CSS', role: 'Estilização utilitária' },
  { name: 'shadcn/ui', role: 'Componentes de interface' },
  { name: 'Recharts', role: 'Gráficos e visualizações' },
  { name: 'date-fns', role: 'Manipulação de datas' },
]

const PAGES = [
  {
    route: '/',
    file: 'src/app/page.tsx',
    description: 'Rota raiz — redireciona automaticamente para /dashboard.',
    type: 'redirect',
  },
  {
    route: '/auth/login',
    file: 'src/app/auth/login/page.tsx',
    description: 'Tela de login com e-mail e senha via Supabase Auth. Redireciona para /dashboard após autenticação.',
    type: 'public',
  },
  {
    route: '/dashboard',
    file: 'src/app/(dashboard)/dashboard/page.tsx',
    description: 'Visão geral do negócio. Cards de métricas (MRR, receita, custos, lucro, clientes, tarefas, receita em risco) e gráfico de área dos últimos 6 meses.',
    type: 'privado',
  },
  {
    route: '/clients',
    file: 'src/app/(dashboard)/clients/page.tsx',
    description: 'Listagem de clientes com filtro por status (Ativo, Trial, Inativo, Churned). CRUD completo via modal (criar, editar, deletar).',
    type: 'privado',
  },
  {
    route: '/clients/[id]',
    file: 'src/app/(dashboard)/clients/[id]/page.tsx',
    description: 'Detalhe do cliente: métricas individuais (receita, custo, lucro, margem), informações gerais e todas as tarefas vinculadas ao cliente.',
    type: 'privado',
  },
  {
    route: '/financial',
    file: 'src/app/(dashboard)/financial/page.tsx',
    description: 'Gestão financeira em duas abas: Entradas (receitas) e Despesas. Cards de resumo com total de receitas, despesas e resultado. CRUD completo em ambas.',
    type: 'privado',
  },
  {
    route: '/demands',
    file: 'src/app/(dashboard)/demands/page.tsx',
    description: 'Kanban board com 5 colunas: Backlog → A fazer → Em progresso → Revisão → Concluído. Botões de mover cards entre colunas. CRUD completo com campo de impacto em receita.',
    type: 'privado',
  },
  {
    route: '/founder',
    file: 'src/app/(dashboard)/founder/page.tsx',
    description: 'Painel do founder em 3 abas: OKRs (com Key Results e barras de progresso), Projetos Estratégicos e Notas Estratégicas com tags. CRUD completo em tudo.',
    type: 'privado',
  },
  {
    route: '/docs',
    file: 'src/app/(dashboard)/docs/page.tsx',
    description: 'Esta página. Documentação técnica completa da aplicação v0.1 beta.',
    type: 'privado',
  },
]

const SERVICES = [
  {
    file: 'src/services/dashboard.ts',
    tabela: '—',
    funcoes: [
      { name: 'getDashboardMetrics()', desc: 'Retorna métricas gerais: MRR, receita total, custos, lucro, clientes ativos/churned, tarefas pendentes, receita em risco.' },
      { name: 'getRevenueChartData()', desc: 'Retorna dados dos últimos 6 meses agrupados por mês: receita, custos e lucro. Usado no gráfico de área.' },
    ],
  },
  {
    file: 'src/services/clients.ts',
    tabela: 'clients',
    funcoes: [
      { name: 'getClients()', desc: 'Lista todos os clientes ordenados por criação. Inclui profit e margin calculados.' },
      { name: 'getClientById(id)', desc: 'Busca um cliente pelo ID com profit e margin.' },
      { name: 'createClient_(formData)', desc: 'Cria um novo cliente.' },
      { name: 'updateClient(id, formData)', desc: 'Atualiza dados de um cliente.' },
      { name: 'deleteClient(id)', desc: 'Remove um cliente.' },
      { name: 'getClientOptions()', desc: 'Lista id e nome dos clientes ativos. Usado nos selects de outros formulários.' },
    ],
  },
  {
    file: 'src/services/financial.ts',
    tabela: 'financial_entries + financial_expenses',
    funcoes: [
      { name: 'getFinancialEntries()', desc: 'Lista todas as entradas financeiras com nome do cliente vinculado.' },
      { name: 'createFinancialEntry(formData)', desc: 'Cria uma entrada financeira.' },
      { name: 'updateFinancialEntry(id, formData)', desc: 'Atualiza uma entrada.' },
      { name: 'deleteFinancialEntry(id)', desc: 'Remove uma entrada.' },
      { name: 'getFinancialExpenses()', desc: 'Lista todas as despesas.' },
      { name: 'createFinancialExpense(formData)', desc: 'Cria uma despesa.' },
      { name: 'updateFinancialExpense(id, formData)', desc: 'Atualiza uma despesa.' },
      { name: 'deleteFinancialExpense(id)', desc: 'Remove uma despesa.' },
      { name: 'calcEntriesTotal(entries)', desc: 'Soma as entradas confirmadas (ignora canceladas).' },
      { name: 'calcExpensesTotal(expenses)', desc: 'Soma todas as despesas.' },
    ],
  },
  {
    file: 'src/services/demands.ts',
    tabela: 'tasks',
    funcoes: [
      { name: 'getTasks()', desc: 'Lista todas as tarefas com nome do cliente vinculado.' },
      { name: 'getTasksByStatus(status)', desc: 'Filtra tarefas por status.' },
      { name: 'createTask(formData)', desc: 'Cria uma tarefa.' },
      { name: 'updateTask(id, formData)', desc: 'Atualiza uma tarefa.' },
      { name: 'updateTaskStatus(id, status)', desc: 'Atualiza apenas o status da tarefa. Usado nos botões ← → do kanban.' },
      { name: 'deleteTask(id)', desc: 'Remove uma tarefa.' },
    ],
  },
  {
    file: 'src/services/founder.ts',
    tabela: 'okrs + key_results + strategic_projects + strategic_notes',
    funcoes: [
      { name: 'getOKRs()', desc: 'Lista OKRs com todos os Key Results aninhados.' },
      { name: 'createOKR(okr)', desc: 'Cria um OKR.' },
      { name: 'updateOKR(id, okr)', desc: 'Atualiza um OKR.' },
      { name: 'deleteOKR(id)', desc: 'Remove um OKR e seus Key Results (CASCADE).' },
      { name: 'createKeyResult(okrId, kr)', desc: 'Adiciona um Key Result a um OKR.' },
      { name: 'updateKeyResult(id, kr)', desc: 'Atualiza um Key Result.' },
      { name: 'deleteKeyResult(id)', desc: 'Remove um Key Result.' },
      { name: 'getProjects()', desc: 'Lista projetos estratégicos.' },
      { name: 'createProject(project)', desc: 'Cria um projeto.' },
      { name: 'updateProject(id, project)', desc: 'Atualiza um projeto.' },
      { name: 'deleteProject(id)', desc: 'Remove um projeto.' },
      { name: 'getNotes()', desc: 'Lista notas estratégicas ordenadas por atualização.' },
      { name: 'upsertNote(note)', desc: 'Cria ou atualiza uma nota (upsert por ID).' },
      { name: 'deleteNote(id)', desc: 'Remove uma nota.' },
    ],
  },
]

const MODELS = [
  {
    name: 'Client / ClientWithProfit',
    tabela: 'clients',
    campos: ['id', 'name', 'product', 'monthly_revenue', 'operational_cost', 'start_date', 'renewal_date', 'status', 'created_at', '(+profit, +margin calculados)'],
  },
  {
    name: 'FinancialEntry',
    tabela: 'financial_entries',
    campos: ['id', 'client_id', 'value', 'type', 'category', 'status', 'date', 'description', 'created_at', '(+clients join)'],
  },
  {
    name: 'FinancialExpense',
    tabela: 'financial_expenses',
    campos: ['id', 'supplier', 'category', 'cost_center', 'value', 'type', 'date', 'description', 'created_at'],
  },
  {
    name: 'Task',
    tabela: 'tasks',
    campos: ['id', 'title', 'description', 'client_id', 'squad', 'responsible', 'priority', 'impacts_revenue', 'revenue_impact_value', 'due_date', 'status', 'created_at', '(+clients join)'],
  },
  {
    name: 'OKR',
    tabela: 'okrs',
    campos: ['id', 'objective', 'status', 'quarter', 'created_at', '(+key_results join)'],
  },
  {
    name: 'KeyResult',
    tabela: 'key_results',
    campos: ['id', 'okr_id', 'description', 'target', 'current', 'unit', 'created_at'],
  },
  {
    name: 'StrategicProject',
    tabela: 'strategic_projects',
    campos: ['id', 'title', 'description', 'status', 'priority', 'due_date', 'created_at'],
  },
  {
    name: 'StrategicNote',
    tabela: 'strategic_notes',
    campos: ['id', 'title', 'content', 'tags[]', 'created_at', 'updated_at'],
  },
]

const INFRA = [
  { file: 'src/middleware.ts', desc: 'Intercepta todas as rotas. Redireciona usuário não autenticado para /auth/login. Redireciona usuário autenticado que tenta acessar /auth para /dashboard.' },
  { file: 'src/lib/supabase/client.ts', desc: 'Cria o cliente Supabase para uso no browser (componentes client-side com "use client").' },
  { file: 'src/lib/supabase/server.ts', desc: 'Cria o cliente Supabase para uso server-side (Server Components, API Routes). Gerencia cookies de sessão.' },
  { file: 'src/lib/utils.ts', desc: 'Funções utilitárias: cn(), formatCurrency(), formatDate(), formatPercent(), calculateProfit(), calculateMargin(), getStatusColor(), getPriorityColor(), getLabelByStatus(), getMonthName().' },
  { file: 'src/hooks/use-toast.ts', desc: 'Hook para disparar notificações toast na interface.' },
  { file: 'src/app/layout.tsx', desc: 'Layout raiz da aplicação. Configura fonte Inter, metadata e inclui o componente <Toaster> globalmente.' },
  { file: 'src/app/(dashboard)/layout.tsx', desc: 'Layout das páginas autenticadas. Renderiza Sidebar + Header + área de conteúdo principal.' },
  { file: 'src/components/layout/Sidebar.tsx', desc: 'Menu lateral com navegação entre as páginas. Destaca a rota ativa. Botão de logout no rodapé.' },
  { file: 'src/components/layout/Header.tsx', desc: 'Barra superior que exibe o título e descrição da página atual com base na rota.' },
  { file: 'supabase/schema.sql', desc: 'SQL completo para criação das 8 tabelas e políticas de Row Level Security (RLS). Rodar no SQL Editor do Supabase.' },
  { file: '.env.local', desc: 'Variáveis de ambiente. NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY obrigatórias. Não commitar no git.' },
  { file: 'next.config.mjs', desc: 'Configuração do Next.js. Server Actions habilitados para localhost:3000.' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    privado: 'text-blue-600 bg-blue-50 border-blue-200',
    público: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    redirect: 'text-gray-500 bg-gray-50 border-gray-200',
  }
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${colors[type] ?? colors.privado}`}>
      {type}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [openService, setOpenService] = useState<string | null>(null)

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Documentação Técnica</h1>
          <p className="text-sm text-muted-foreground mt-1">L Board — versão {VERSION}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          BETA 0.1
        </span>
      </div>

      {/* Stack */}
      <Section title="Stack Tecnológico">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {STACK.map((s) => (
            <Card key={s.name} className="shadow-none">
              <CardContent className="p-3">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Pages */}
      <Section title="Páginas e Rotas">
        <Card className="shadow-none">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Rota</th>
                  <th className="px-4 py-3 text-left font-medium">Arquivo</th>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {PAGES.map((p) => (
                  <tr key={p.route} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary whitespace-nowrap">{p.route}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.file}</td>
                    <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Section>

      {/* Services */}
      <Section title="Services (Acesso ao Banco)">
        <div className="space-y-2">
          {SERVICES.map((s) => (
            <Card key={s.file} className="shadow-none">
              <CardHeader
                className="cursor-pointer py-3"
                onClick={() => setOpenService(openService === s.file ? null : s.file)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-mono font-semibold text-primary">{s.file}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Tabela: <span className="font-medium">{s.tabela}</span> · {s.funcoes.length} funções</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{openService === s.file ? '▲' : '▼'}</span>
                </div>
              </CardHeader>
              {openService === s.file && (
                <CardContent className="pt-0 space-y-2">
                  {s.funcoes.map((f) => (
                    <div key={f.name} className="flex gap-3 rounded-md bg-muted/40 px-3 py-2">
                      <code className="text-xs font-mono text-primary whitespace-nowrap shrink-0">{f.name}</code>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </Section>

      {/* Models */}
      <Section title="Modelos de Dados (Types)">
        <p className="text-xs text-muted-foreground">Arquivo: <code className="font-mono">src/types/index.ts</code></p>
        <div className="grid gap-3 md:grid-cols-2">
          {MODELS.map((m) => (
            <Card key={m.name} className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{m.name}</CardTitle>
                <p className="text-xs text-muted-foreground">Tabela: <code className="font-mono">{m.tabela}</code></p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {m.campos.map((c) => (
                    <code key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs">{c}</code>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Infrastructure */}
      <Section title="Infraestrutura e Configuração">
        <Card className="shadow-none">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Arquivo</th>
                  <th className="px-4 py-3 text-left font-medium">Responsabilidade</th>
                </tr>
              </thead>
              <tbody>
                {INFRA.map((i) => (
                  <tr key={i.file} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-primary whitespace-nowrap align-top">{i.file}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{i.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Section>

      {/* Database */}
      <Section title="Banco de Dados">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { table: 'clients', desc: 'Clientes com receita mensal, custo operacional, status e datas de início/renovação.' },
            { table: 'financial_entries', desc: 'Entradas financeiras (receitas) com tipo, categoria, status e vínculo com cliente.' },
            { table: 'financial_expenses', desc: 'Despesas com fornecedor, categoria, centro de custo e tipo (fixo/variável/investimento).' },
            { table: 'tasks', desc: 'Tarefas do kanban com prioridade, status, responsável, squad e flag de impacto em receita.' },
            { table: 'okrs', desc: 'Objetivos estratégicos com status e quarter. Relacionado com key_results (1:N).' },
            { table: 'key_results', desc: 'Resultados-chave de cada OKR com meta, valor atual e unidade. Deletado em cascata com o OKR pai.' },
            { table: 'strategic_projects', desc: 'Projetos estratégicos com status, prioridade e prazo.' },
            { table: 'strategic_notes', desc: 'Notas estratégicas com conteúdo livre e tags (array de texto).' },
          ].map((db) => (
            <Card key={db.table} className="shadow-none">
              <CardContent className="p-3 flex gap-3">
                <code className="text-xs font-mono font-bold text-primary shrink-0">{db.table}</code>
                <p className="text-xs text-muted-foreground">{db.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          RLS ativo em todas as tabelas. Política: apenas usuários autenticados têm acesso total (<code className="font-mono">auth_full_access</code>).
        </p>
      </Section>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        L Board v{VERSION} · Gerado em {new Date().toLocaleDateString('pt-BR')} · Single-tenant (founder only)
      </div>
    </div>
  )
}
