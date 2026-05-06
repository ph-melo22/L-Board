'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Data ─────────────────────────────────────────────────────────────────────

const VERSION = '1.0.0'

const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-05-05',
    changes: [
      'Multi-tenancy completo: cada conta tem seu próprio espaço isolado com organização, equipe e dados independentes',
      'Página /auth/register: cadastro com nome, e-mail, senha e nome da empresa — cria organização e perfil founder automaticamente',
      'API POST /api/auth/register: cria usuário via admin (sem confirmação de e-mail), organização e perfil com role=founder em transação',
      'Convite atualizado: convidados entram na organização do convidante (organization_id propagado no perfil)',
      'Chaves de IA por organização: founders configuram suas próprias chaves OpenAI/Anthropic/Gemini em /settings',
      'Importação via IA usa a chave OpenAI ativa da organização; fallback para variável de ambiente OPENAI_API_KEY',
      'Página /settings: editar nome da organização + gerenciar chaves de IA (AES-256-GCM, nunca exibidas novamente)',
      'APIs /api/settings (GET/PATCH) e /api/settings/ai-keys (GET/POST) e /api/settings/ai-keys/[id] (PATCH/DELETE)',
      'Sidebar: link "Configurações" adicionado ao founderNav',
      'Login: link "Criar conta" aponta para /auth/register',
      'Landing page: CTAs "Criar conta" e "Criar conta grátis" apontam para /auth/register',
      'Middleware: /auth/register acessível sem autenticação; /settings permitido para founder',
      'Middleware: lógica de auto-criação de perfil removida (registro e convite criam perfis explicitamente)',
      'Utilitário src/lib/crypto.ts: encrypt/decrypt compartilhados entre client e organization api keys',
      'Tipos: Organization, OrgApiKey, OrgApiKeyProvider adicionados; Profile agora inclui organization_id',
      'SQL necessário: tabelas organizations e organization_api_keys; coluna organization_id em todas as tabelas de dados; função get_user_org_id(); RLS por organização',
    ],
  },
  {
    version: '0.9.2',
    date: '2026-05-05',
    changes: [
      'Adiciona perfis "Gestor" (manager) e "Financeiro" (financial) ao sistema de roles',
      'Middleware: manager acessa /dashboard, /clients, /demands, /projects; financial acessa /dashboard, /financial, /contador, /clients',
      'Sidebar: managerNav e financialNav com navegação específica por perfil; labels "Gestão" e "Financeiro" na barra lateral',
      'Página /team: ROLE_CONFIG e INVITE_ROLES atualizados com ícones Briefcase e BarChart2; descrição de acesso dinâmica por role',
      'UserRole em src/types/index.ts atualizado: founder | manager | financial | developer | employee',
    ],
  },
  {
    version: '0.9.1',
    date: '2026-05-05',
    changes: [
      'Adiciona Landing Page pública em lboard.com.br (rota /)',
      'Design dark e moderno inspirado em Vercel: grid background, glow radial, gradient text, glassmorphism cards',
      'Seções: Navbar fixed com blur, Hero fullscreen, Stats strip, Features grid 3x2, CTA final, Footer',
      'Destaques: Financeiro, Clientes com Margem, IA, Kanban Financeiro, Roles, API Keys',
      'Middleware atualizado: / liberado para usuários não autenticados; autenticados redirecionados para /dashboard',
      'src/app/page.tsx convertido de redirect para landing page (Server Component)',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-05-05',
    changes: [
      'Adiciona Security Headers em next.config.mjs: X-Frame-Options, HSTS, nosniff, XSS-Protection, Referrer-Policy, Permissions-Policy',
      'Adiciona Rate Limiting: /api/team/invite (5/min), /api/clients/api-keys POST (20/min), /api/projects/ai-tasks (10/min)',
      'Adiciona Session Validation (requireAuth) em todas as API routes privilegiadas',
      'PWA: manifest.ts, icon.tsx (32x32) e apple-icon.tsx (180x180) gerados dinamicamente via next/og',
      'Vercel Analytics: @vercel/analytics instalado e <Analytics /> adicionado ao layout raiz',
      'allowedOrigins em next.config.mjs atualizado para incluir lboard.com.br',
      'Novo utilitário src/lib/rateLimit.ts e src/lib/requireAuth.ts',
    ],
  },
  {
    version: '0.8.1',
    date: '2026-05-05',
    changes: [
      'Domínio lboard.com.br configurado e validado na Vercel com nameservers ns1/ns2.vercel-dns.com',
      'Resend: domínio lboard.com.br verificado com registros DKIM, SPF (MX + TXT) adicionados na Vercel DNS',
      'Remetente de e-mail atualizado de onboarding@resend.dev para noreply@lboard.com.br',
      'Supabase SMTP configurado para usar Resend (smtp.resend.com) como provedor de e-mail transacional',
      'Supabase: Site URL e Redirect URL atualizados para https://lboard.com.br',
      'Vercel: NEXT_PUBLIC_APP_URL atualizado para https://lboard.com.br',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-05-04',
    changes: [
      'Adiciona módulo de Integrações (API Keys) por cliente em clients/[id]',
      'Nova tabela Supabase: client_api_keys (client_id, provider, encrypted_key, iv, auth_tag, key_hint, is_active)',
      'Suporte a 6 provedores: OpenAI, Anthropic, Google Gemini, Grok (xAI), DeepSeek e Outro',
      'Criptografia AES-256-GCM server-side via API Route /api/clients/api-keys; chave nunca exposta no client',
      'UI: card Integrações em clients/[id] com lista de chaves mascaradas (••••xxxx), toggle ativo/inativo e exclusão',
      'Novo serviço src/services/apiKeys.ts com getClientApiKeys, createClientApiKey, updateClientApiKey, deleteClientApiKey',
      'Novas rotas: POST/GET /api/clients/api-keys e PATCH/DELETE /api/clients/api-keys/[id]',
      'Nova variável de ambiente ENCRYPTION_KEY (32 bytes hex) adicionada ao .env.local e necessária em produção',
      'Novos tipos: ApiKeyProvider, ClientApiKey, ClientApiKeyFormData em src/types/index.ts',
    ],
  },
  {
    version: '0.7.1',
    date: '2026-05-02',
    changes: [
      'Otimiza toda a aplicação para acesso mobile',
      'Adiciona overflow-y-auto max-h-[90vh] em todos os DialogContent com formulários longos (contador, financial, demands, clients, projects, team, founder)',
      'Corrige toolbar das abas internas de Lançamentos e Contas no contador para layout flex-col em mobile (sm:flex-row no desktop)',
      'Corrige toolbar das abas do Financeiro para empilhar verticalmente em mobile',
      'Corrige toolbar das abas do Founder Board para empilhar verticalmente; TabsList com h-auto flex-wrap para 4 abas',
      'Adiciona overflow-x-auto na tabela de Demandas do cliente em clients/[id]',
      'Dialogs de task, subtask e IA em projects/[id] recebem max-h-[90vh]',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-05-02',
    changes: [
      'Adiciona módulo completo de gestão financeira na rota /contador (founder only)',
      'Visão Geral: KPIs executivos em 4 seções (Saúde, Caixa, Eficiência, Riscos) com alertas visuais automáticos',
      'DRE: Demonstrativo de Resultado auto-calculado com filtro por período (mês, ano, acumulado)',
      'Caixa: gráfico de Entradas vs Saídas (8 meses), projeção de 30/60/90 dias baseada em tendência',
      'Lançamentos: CRUD completo para Receitas, Despesas (com campo Natureza DRE) e Impostos',
      'Contas: CRUD para Contas a Pagar e Contas a Receber com status automático de vencimento',
      'Indicadores: CAC, LTV, LTV/CAC, Ticket Médio, Burn Rate, Runway, Receita/Colaborador, Custo/Cliente',
      'Sistema de alertas: detecta margem bruta crítica, impostos vencidos, contas vencidas, runway baixo, LTV/CAC desfavorável',
      'Novas tabelas Supabase: impostos, contas_pagar, contas_receber',
      'Nova coluna nature (cogs/opex/da) em financial_expenses para classificação no DRE',
      'Novo serviço src/services/contador.ts com calcDRE, calcFluxoCaixa, calcIndicadores, calcAlertas',
      'Sidebar atualizada: aba Contador adicionada ao founderNav com ícone Calculator',
      'Middleware: /contador adicionado às rotas permitidas para founder',
    ],
  },
  {
    version: '0.6.3',
    date: '2026-05-02',
    changes: [
      'Corrige erro "Error sending invite email" ao convidar membros da equipe',
      'Rota /api/team/invite migrada de inviteUserByEmail para generateLink + envio manual via Resend HTTP API',
      'E-mail de convite agora usa template HTML com identidade visual do L Board',
      'Convite inclui o nome do convidado no corpo do e-mail',
    ],
  },
  {
    version: '0.6.2',
    date: '2026-05-02',
    changes: [
      'Importação via IA agora aceita qualquer tipo de arquivo (PDF, Word/DOCX, imagens, TXT, CSV, MD, JSON, XML, HTML e mais)',
      'Limite de upload aumentado para 300 MB (verificado server-side)',
      'Imagens (JPG, PNG, etc.) são analisadas via GPT-4o Vision sem extração de texto',
      'Arquivos Word/DOCX têm texto extraído pelo pacote mammoth',
      'Outros formatos são lidos como UTF-8 diretamente',
      'UI do diálogo de IA atualizada: removida restrição accept=PDF, tamanho exibido em KB ou MB conforme o arquivo',
      'next.config.mjs: mammoth adicionado a serverExternalPackages, bodySizeLimit definido como 300mb',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-05-01',
    changes: [
      'Corrige falha de build no Vercel: import estático de pdf-parse substituído por import dinâmico dentro do handler',
      'API route /api/projects/[id]/ai-tasks agora carrega pdf-parse apenas em runtime, evitando erro de bundling em build',
    ],
  },
  {
    version: '0.6.0 beta',
    date: '2026-05-01',
    changes: [
      'Projetos agora visíveis para todos os roles (employee e developer) com filtro automático por membro',
      'Botão "Meus projetos" na listagem — filtra projetos onde o usuário é dono ou membro',
      'Notificação por e-mail automática ao delegar atividade ou sub-atividade a um membro',
      'API route POST /api/notify/task-assigned via Resend (falha silenciosa se RESEND_API_KEY ausente)',
      'Botão "Exportar" na página do projeto — gera relatório HTML formatado com print/PDF nativo do browser',
      'Relatório inclui: status, progresso, objetivos, escopo, entregáveis, riscos, membros e lista de atividades',
      'Sidebar atualizada: /projects adicionado a employeeNav e developerNav',
      'Middleware: /projects liberado para developer e employee',
    ],
  },
  {
    version: '0.5.0 beta',
    date: '2026-05-01',
    changes: [
      'Importação de tarefas via IA: botão "Importar via IA" na página de detalhe do projeto',
      'Upload de PDF com extração de texto server-side via pdf-parse',
      'Análise por GPT-4o com prompt estruturado — retorna tasks + subtasks em JSON',
      'Tela de preview com seleção individual de tarefas antes de confirmar criação',
      'Delegação automática: quando o documento menciona membros da equipe, a IA sugere o responsável',
      'API route POST /api/projects/[id]/ai-tasks — recebe PDF, extrai texto, chama OpenAI, retorna JSON',
      'Variável de ambiente OPENAI_API_KEY adicionada ao projeto (não exposta no client-side)',
      'Pacotes adicionados: openai, pdf-parse (@types/pdf-parse)',
      'next.config.mjs: serverExternalPackages incluindo pdf-parse para compatibilidade com Next.js 14',
    ],
  },
  {
    version: '0.4.0 beta',
    date: '2026-05-01',
    changes: [
      'Módulo Projetos: CRUD completo com atividades e sub-atividades em /projects',
      'Página /projects com grid de cards mostrando status, progresso e prioridade',
      'Página /projects/[id] com layout duas colunas: atividades (esquerda) e dashboard de progresso (direita)',
      'Dashboard de progresso com anel SVG animado mostrando % de conclusão em tempo real',
      'Atividades com checklist expansível e sub-atividades aninhadas',
      'Quick-add inline para adicionar sub-atividades diretamente na lista',
      'Delegação de atividades e sub-atividades a membros da equipe via select',
      'Gerenciamento de membros do projeto: adicionar/remover direto no painel lateral',
      'Campos detalhados por projeto: Objetivos, Escopo, Entregáveis e Riscos',
      'Cálculo de progresso ponderado: subtarefas são a unidade atômica; tasks sem subtarefas contam como 1 item',
      'Atualização otimista nos checkboxes com rollback automático em caso de erro',
      'Adicionado /projects à navegação do Founder e ao controle de acesso do middleware',
      'Novas tabelas no Supabase: projects, project_members, project_tasks, project_subtasks',
      'Novo service: src/services/projects.ts com 15 funções de CRUD',
      'Novos tipos: Project, ProjectMember, ProjectTask, ProjectSubtask, ProjectWithDetails, ProjectListItem',
    ],
  },
  {
    version: '0.3.0 beta',
    date: '2026-04-13',
    changes: [
      'Otimização completa para Mobile (iOS e Android)',
      'Sidebar como drawer deslizante no mobile com overlay e fechamento ao navegar',
      'Botão hamburger (☰) no Header visível apenas em telas pequenas',
      'DashboardShell: novo client component que gerencia estado do menu mobile',
      'Padding responsivo no layout principal: p-4 (mobile) → p-6 (desktop)',
      'Viewport meta tag com viewport-fit=cover para safe area do iPhone (notch/home indicator)',
      'themeColor dinâmico para barra do navegador em light/dark mode',
      'Tabelas de Clientes, Entradas e Despesas com overflow-x-auto para scroll horizontal',
      'Kanban de Demandas com scroll horizontal fluido e colunas min-w-[200px]',
      'Grid de cards Financeiro: grid-cols-3 fixo → grid-cols-1 sm:grid-cols-3',
      'Fluxo "Esqueci minha senha": formulário de e-mail → link por e-mail → nova senha',
      'Página /auth/forgot-password com confirmação visual de envio',
      'Página /auth/reset-password com indicador de força de senha (fraca/média/forte)',
      'Route handler /auth/callback: troca code por sessão (PKCE) para convite e recuperação',
      'Fluxo de convite: founder convida → pessoa recebe e-mail → cria senha → acessa com role correto',
      'Página /team dedicada para gestão de equipe (founders only)',
      'Middleware atualizado: /auth/reset-password e /auth/callback acessíveis mesmo com sessão ativa',
      'API de convite atualizada com redirectTo dinâmico baseado na origin da requisição',
    ],
  },
  {
    version: '0.2.0 beta',
    date: '2026-04-12',
    changes: [
      'Sistema de equipe: convite de funcionários por e-mail via Supabase Auth',
      'Roles: founder, employee, developer (Dev/TI) com acessos distintos',
      'Tabela profiles com RLS — perfil criado automaticamente no primeiro login',
      'Middleware atualizado com controle de acesso por role',
      'Sidebar dinâmica — exibe navegação de acordo com o role do usuário',
      'Aba "Equipe" no Founder Board com convite, edição de role e remoção de membros',
      'API routes: /api/team/invite, /api/team/remove/[id], /api/team/role',
      'Admin client Supabase (service_role) para operações privilegiadas',
      'Deploy na Vercel — app hospedado em produção',
      'Correção de tipos TypeScript nos cookies do Supabase SSR',
    ],
  },
  {
    version: '0.1.0 beta',
    date: '2026-04-10',
    changes: [
      'Dashboard com métricas (MRR, receita, custos, lucro, clientes, tarefas)',
      'Gráfico de área dos últimos 6 meses',
      'Alertas de renovação de clientes (próximos 30 dias)',
      'Simulador de crescimento com projeção de MRR',
      'Módulo Clientes: CRUD, filtros, ordenação, paginação, detalhe por cliente',
      'Módulo Financeiro: entradas e despesas com gráfico PieChart por categoria',
      'Kanban de Demandas: 5 colunas, prioridade crítica, filtros avançados',
      'Founder Board: OKRs com Key Results, Projetos Estratégicos, Notas com tags',
      'Autenticação via Supabase Auth com proteção de rotas por middleware',
      'Schema SQL completo com 8 tabelas e RLS',
      'Documentação técnica integrada ao app',
    ],
  },
]

const STACK = [
  { name: 'Next.js 14', role: 'Framework React (App Router)' },
  { name: 'TypeScript', role: 'Tipagem estática' },
  { name: 'Supabase', role: 'Banco de dados (PostgreSQL) + Auth + SMTP' },
  { name: 'Tailwind CSS', role: 'Estilização utilitária' },
  { name: 'shadcn/ui', role: 'Componentes de interface' },
  { name: 'Recharts', role: 'Gráficos e visualizações' },
  { name: 'OpenAI GPT-4o', role: 'IA para geração de tarefas a partir de PDF' },
  { name: 'pdf-parse', role: 'Extração de texto de PDFs (server-side)' },
  { name: 'Resend', role: 'Envio de e-mails transacionais via noreply@lboard.com.br' },
  { name: 'Vercel', role: 'Hospedagem, deploy contínuo e DNS (lboard.com.br)' },
]

const ROLES = [
  {
    role: 'founder',
    label: 'Founder',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    acesso: 'Acesso total: Dashboard, Clientes, Financeiro, Contador, Demandas, Projetos, Founder Board, Documentação, Equipe. Pode convidar, alterar roles e remover membros.',
  },
  {
    role: 'manager',
    label: 'Gestor',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    acesso: 'Dashboard, Clientes, Demandas, Projetos. Gerencia entregas e clientes sem acesso ao financeiro interno.',
  },
  {
    role: 'financial',
    label: 'Financeiro',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    acesso: 'Dashboard, Clientes, Financeiro, Contador. Visão financeira completa sem acesso a demandas ou projetos.',
  },
  {
    role: 'developer',
    label: 'Dev / TI',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    acesso: 'Dashboard, Demandas, Projetos, Documentação.',
  },
  {
    role: 'employee',
    label: 'Funcionário',
    color: 'text-muted-foreground bg-muted border-border',
    acesso: 'Dashboard, Demandas, Projetos.',
  },
]

const PAGES = [
  { route: '/', file: 'src/app/page.tsx', description: 'Landing page pública. Dark e moderno com hero, features grid, stats e CTA. Usuário autenticado é redirecionado para /dashboard pelo middleware.', type: 'público' },
  { route: '/auth/login', file: 'src/app/auth/login/page.tsx', description: 'Tela de login com e-mail e senha. Link "Esqueci minha senha" abaixo do campo de senha.', type: 'público' },
  { route: '/auth/forgot-password', file: 'src/app/auth/forgot-password/page.tsx', description: 'Formulário para recuperação de senha. Envia e-mail com link via Supabase e exibe confirmação visual.', type: 'público' },
  { route: '/auth/callback', file: 'src/app/auth/callback/route.ts', description: 'Route handler que recebe o redirect do Supabase (convite ou recuperação). Troca o code por sessão (PKCE) e redireciona para /auth/reset-password.', type: 'público' },
  { route: '/auth/reset-password', file: 'src/app/auth/reset-password/page.tsx', description: 'Definição de nova senha. Usado para recuperação e para aceitar convites. Inclui indicador de força de senha e confirmação.', type: 'público' },
  { route: '/dashboard', file: 'src/app/(dashboard)/dashboard/page.tsx', description: 'Visão geral: MRR, receita, custos, lucro, clientes, tarefas, receita em risco. Gráfico de área 6 meses + simulador de crescimento.', type: 'privado' },
  { route: '/clients', file: 'src/app/(dashboard)/clients/page.tsx', description: 'Listagem com filtro por status, ordenação, paginação. CRUD completo. Tabela com scroll horizontal no mobile.', type: 'founder' },
  { route: '/clients/[id]', file: 'src/app/(dashboard)/clients/[id]/page.tsx', description: 'Detalhe do cliente: métricas, informações, tarefas vinculadas e card de Integrações (API Keys).', type: 'founder' },
  { route: '/api/clients/api-keys', file: 'src/app/api/clients/api-keys/route.ts', description: 'GET (lista keys do cliente) e POST (cria key com criptografia AES-256-GCM). Requer ENCRYPTION_KEY no ambiente.', type: 'api' },
  { route: '/api/clients/api-keys/[id]', file: 'src/app/api/clients/api-keys/[id]/route.ts', description: 'PATCH (toggle is_active ou label) e DELETE (remove key). Opera via createAdminClient.', type: 'api' },
  { route: '/financial', file: 'src/app/(dashboard)/financial/page.tsx', description: 'Entradas e despesas com gráfico PieChart. CRUD completo. Tabelas com scroll horizontal no mobile.', type: 'founder' },
  { route: '/demands', file: 'src/app/(dashboard)/demands/page.tsx', description: 'Kanban 5 colunas com filtros avançados. Scroll horizontal no mobile. Prioridade crítica destacada.', type: 'privado' },
  { route: '/projects', file: 'src/app/(dashboard)/projects/page.tsx', description: 'Lista de projetos com cards de progresso. CRUD de projetos com dialog de criação.', type: 'founder' },
  { route: '/projects/[id]', file: 'src/app/(dashboard)/projects/[id]/page.tsx', description: 'Detalhe do projeto: atividades com sub-atividades, dashboard de progresso, membros, campos detalhados e botão "Importar via IA" para gerar tasks a partir de PDF.', type: 'founder' },
  { route: '/api/projects/[id]/ai-tasks', file: 'src/app/api/projects/[id]/ai-tasks/route.ts', description: 'POST — recebe PDF via multipart/form-data, extrai texto com pdf-parse, envia ao GPT-4o e retorna JSON com tasks e subtasks gerados.', type: 'api' },
  { route: '/api/notify/task-assigned', file: 'src/app/api/notify/task-assigned/route.ts', description: 'POST — envia e-mail via Resend ao membro delegado. Falha silenciosamente se RESEND_API_KEY não estiver configurada.', type: 'api' },
  { route: '/founder', file: 'src/app/(dashboard)/founder/page.tsx', description: 'OKRs, Projetos Estratégicos e Notas estratégicas.', type: 'founder' },
  { route: '/team', file: 'src/app/(dashboard)/team/page.tsx', description: 'Gestão de equipe exclusiva para founders. Lista membros, convida por e-mail com role, altera permissões e remove acesso.', type: 'founder' },
  { route: '/docs', file: 'src/app/(dashboard)/docs/page.tsx', description: 'Esta página. Documentação técnica atualizada a cada versão.', type: 'dev' },
  { route: '/api/team/invite', file: 'src/app/api/team/invite/route.ts', description: 'POST — convida usuário por e-mail (redirectTo dinâmico para /auth/callback) e pré-cria perfil com role.', type: 'api' },
  { route: '/api/team/remove/[id]', file: 'src/app/api/team/remove/[id]/route.ts', description: 'DELETE — remove usuário do Supabase Auth (cascata no profiles).', type: 'api' },
  { route: '/api/team/role', file: 'src/app/api/team/role/route.ts', description: 'PATCH — atualiza o role de um membro da equipe.', type: 'api' },
]

const SERVICES = [
  {
    file: 'src/services/dashboard.ts',
    tabela: '—',
    funcoes: [
      { name: 'getDashboardMetrics()', desc: 'Métricas gerais: MRR, receita total, custos, lucro, clientes ativos/churned, tarefas pendentes, receita em risco.' },
      { name: 'getRevenueChartData()', desc: 'Dados dos últimos 6 meses por mês: receita, custos e lucro. Usado no gráfico de área.' },
    ],
  },
  {
    file: 'src/services/clients.ts',
    tabela: 'clients',
    funcoes: [
      { name: 'getClients()', desc: 'Lista todos os clientes com profit e margin calculados.' },
      { name: 'getClientById(id)', desc: 'Busca cliente pelo ID com profit e margin.' },
      { name: 'createClient(formData)', desc: 'Cria um novo cliente.' },
      { name: 'updateClient(id, formData)', desc: 'Atualiza dados de um cliente.' },
      { name: 'deleteClient(id)', desc: 'Remove um cliente.' },
      { name: 'getClientOptions()', desc: 'Lista id e nome dos clientes. Usado nos selects.' },
    ],
  },
  {
    file: 'src/services/financial.ts',
    tabela: 'financial_entries + financial_expenses',
    funcoes: [
      { name: 'getFinancialEntries()', desc: 'Lista entradas com nome do cliente vinculado.' },
      { name: 'createFinancialEntry(formData)', desc: 'Cria entrada financeira.' },
      { name: 'updateFinancialEntry(id, formData)', desc: 'Atualiza entrada.' },
      { name: 'deleteFinancialEntry(id)', desc: 'Remove entrada.' },
      { name: 'getFinancialExpenses()', desc: 'Lista despesas.' },
      { name: 'createFinancialExpense(formData)', desc: 'Cria despesa.' },
      { name: 'updateFinancialExpense(id, formData)', desc: 'Atualiza despesa.' },
      { name: 'deleteFinancialExpense(id)', desc: 'Remove despesa.' },
    ],
  },
  {
    file: 'src/services/demands.ts',
    tabela: 'tasks',
    funcoes: [
      { name: 'getTasks()', desc: 'Lista todas as tarefas com cliente vinculado.' },
      { name: 'createTask(formData)', desc: 'Cria tarefa.' },
      { name: 'updateTask(id, formData)', desc: 'Atualiza tarefa.' },
      { name: 'updateTaskStatus(id, status)', desc: 'Atualiza apenas o status. Usado nos botões ← → do kanban.' },
      { name: 'deleteTask(id)', desc: 'Remove tarefa.' },
    ],
  },
  {
    file: 'src/services/founder.ts',
    tabela: 'okrs + key_results + strategic_projects + strategic_notes',
    funcoes: [
      { name: 'getOKRs()', desc: 'Lista OKRs com Key Results aninhados.' },
      { name: 'createOKR / updateOKR / deleteOKR', desc: 'CRUD de OKRs.' },
      { name: 'createKeyResult / updateKeyResult / deleteKeyResult', desc: 'CRUD de Key Results.' },
      { name: 'getProjects / createProject / updateProject / deleteProject', desc: 'CRUD de Projetos Estratégicos.' },
      { name: 'getNotes / upsertNote / deleteNote', desc: 'CRUD de Notas Estratégicas (upsert por ID).' },
    ],
  },
  {
    file: 'src/services/projects.ts',
    tabela: 'projects + project_members + project_tasks + project_subtasks',
    funcoes: [
      { name: 'getProjects()', desc: 'Lista todos os projetos com atividades e sub-atividades para cálculo de progresso.' },
      { name: 'getProject(id)', desc: 'Retorna projeto completo com membros, atividades e sub-atividades.' },
      { name: 'createProject(formData)', desc: 'Cria projeto com owner_id do usuário logado.' },
      { name: 'updateProject(id, formData)', desc: 'Atualiza campos do projeto.' },
      { name: 'deleteProject(id)', desc: 'Remove projeto em cascata (membros, tarefas, subtarefas).' },
      { name: 'addProjectMember / removeProjectMember', desc: 'Gerencia membros do projeto.' },
      { name: 'createProjectTask / updateProjectTask / toggleProjectTask / deleteProjectTask', desc: 'CRUD de atividades com toggle de conclusão.' },
      { name: 'createProjectSubtask / updateProjectSubtask / toggleProjectSubtask / deleteProjectSubtask', desc: 'CRUD de sub-atividades com toggle de conclusão.' },
    ],
  },
  {
    file: 'src/services/apiKeys.ts',
    tabela: 'client_api_keys (via API Route)',
    funcoes: [
      { name: 'getClientApiKeys(client_id)', desc: 'Lista todas as keys do cliente (sem dados criptografados — retorna apenas key_hint, provider, label, is_active).' },
      { name: 'createClientApiKey(formData)', desc: 'Envia key para /api/clients/api-keys que criptografa com AES-256-GCM e salva no banco.' },
      { name: 'updateClientApiKey(id, updates)', desc: 'Atualiza is_active ou label via PATCH /api/clients/api-keys/[id].' },
      { name: 'deleteClientApiKey(id)', desc: 'Remove a key permanentemente via DELETE /api/clients/api-keys/[id].' },
    ],
  },
  {
    file: 'src/services/team.ts',
    tabela: 'profiles',
    funcoes: [
      { name: 'getTeam()', desc: 'Lista todos os membros (profiles) ordenados por criação.' },
      { name: 'getCurrentProfile()', desc: 'Retorna o perfil do usuário logado.' },
      { name: 'inviteTeamMember(name, email, role)', desc: 'Chama /api/team/invite para enviar convite e criar perfil.' },
      { name: 'removeTeamMember(id)', desc: 'Chama /api/team/remove/[id] para revogar acesso.' },
      { name: 'updateMemberRole(id, role)', desc: 'Chama /api/team/role para alterar função.' },
    ],
  },
]

const MODELS = [
  { name: 'Client / ClientWithProfit', tabela: 'clients', campos: ['id', 'name', 'product', 'monthly_revenue', 'operational_cost', 'start_date', 'renewal_date', 'status', 'created_at', '+profit', '+margin'] },
  { name: 'FinancialEntry', tabela: 'financial_entries', campos: ['id', 'client_id', 'value', 'type', 'category', 'status', 'date', 'description', 'created_at', '+clients join'] },
  { name: 'FinancialExpense', tabela: 'financial_expenses', campos: ['id', 'supplier', 'category', 'cost_center', 'value', 'type', 'date', 'description', 'created_at'] },
  { name: 'Task', tabela: 'tasks', campos: ['id', 'title', 'description', 'client_id', 'squad', 'responsible', 'priority', 'impacts_revenue', 'revenue_impact_value', 'due_date', 'status', 'created_at'] },
  { name: 'OKR', tabela: 'okrs', campos: ['id', 'objective', 'status', 'quarter', 'created_at', '+key_results'] },
  { name: 'KeyResult', tabela: 'key_results', campos: ['id', 'okr_id', 'description', 'target', 'current', 'unit', 'created_at'] },
  { name: 'StrategicProject', tabela: 'strategic_projects', campos: ['id', 'title', 'description', 'status', 'priority', 'due_date', 'created_at'] },
  { name: 'StrategicNote', tabela: 'strategic_notes', campos: ['id', 'title', 'content', 'tags[]', 'created_at', 'updated_at'] },
  { name: 'Profile', tabela: 'profiles', campos: ['id', 'full_name', 'email', 'role', 'created_at'] },
  { name: 'ClientApiKey', tabela: 'client_api_keys', campos: ['id', 'client_id', 'provider', 'label', 'key_hint', 'is_active', 'created_at', 'updated_at'] },
  { name: 'ClientApiKeyFormData', tabela: '—', campos: ['client_id', 'provider', 'label', 'api_key (plaintext — nunca persiste)'] },
  { name: 'Project / ProjectWithDetails / ProjectListItem', tabela: 'projects', campos: ['id', 'title', 'description', 'objectives', 'scope', 'deliverables', 'risks', 'status', 'priority', 'start_date', 'end_date', 'owner_id', 'created_at', '+project_members', '+project_tasks'] },
  { name: 'ProjectMember', tabela: 'project_members', campos: ['id', 'project_id', 'user_id', 'created_at'] },
  { name: 'ProjectTask', tabela: 'project_tasks', campos: ['id', 'project_id', 'title', 'description', 'assigned_to', 'due_date', 'position', 'completed', 'created_at', '+project_subtasks'] },
  { name: 'ProjectSubtask', tabela: 'project_subtasks', campos: ['id', 'task_id', 'title', 'assigned_to', 'due_date', 'completed', 'created_at'] },
]

const INFRA = [
  { file: 'src/middleware.ts', desc: 'Intercepta todas as rotas. Autentica usuário, auto-cria perfil no primeiro login, redireciona por role. Libera /auth/callback, /auth/reset-password e /auth/forgot-password mesmo com sessão ativa.' },
  { file: 'src/components/layout/DashboardShell.tsx', desc: 'Client component que gerencia o estado do menu mobile (sidebarOpen). Renderiza Sidebar, overlay, Header e children.' },
  { file: 'src/components/layout/Sidebar.tsx', desc: 'Menu lateral dinâmico. No mobile funciona como drawer: oculto por padrão, desliza da esquerda ao abrir. Fecha automaticamente ao navegar.' },
  { file: 'src/components/layout/Header.tsx', desc: 'Barra superior com título/descrição da página. Inclui botão hamburger (☰) visível apenas no mobile (md:hidden).' },
  { file: 'src/lib/supabase/client.ts', desc: 'Cliente Supabase para uso no browser (componentes "use client").' },
  { file: 'src/lib/supabase/server.ts', desc: 'Cliente Supabase server-side para Server Components e API Routes.' },
  { file: 'src/lib/supabase/admin.ts', desc: 'Cliente Supabase com service_role key. Exclusivo para API routes — nunca expor no client-side.' },
  { file: 'src/lib/utils.ts', desc: 'Funções utilitárias: cn(), formatCurrency(), formatDate(), formatPercent(), getStatusColor(), getPriorityColor(), getLabelByStatus().' },
  { file: 'supabase/schema.sql', desc: 'SQL completo: 9 tabelas (clients, financial_entries, financial_expenses, tasks, okrs, key_results, strategic_projects, strategic_notes, profiles) + RLS.' },
  { file: 'supabase/projects_schema.sql', desc: 'SQL do módulo Projetos: 4 tabelas (projects, project_members, project_tasks, project_subtasks) + RLS. Executar separadamente no Supabase.' },
  { file: '.env.local', desc: 'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, RESEND_API_KEY, ENCRYPTION_KEY (32 bytes hex — AES-256 para API Keys), NEXT_PUBLIC_APP_URL. Nunca commitar no git.' },
  { file: 'next.config.mjs', desc: 'serverExternalPackages: [\'pdf-parse\'] para evitar problemas de bundling no Next.js 14. serverActions com allowedOrigins.' },
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
    privado:   'text-blue-600 bg-blue-50 border-blue-200',
    público:   'text-emerald-600 bg-emerald-50 border-emerald-200',
    founder:   'text-amber-600 bg-amber-50 border-amber-200',
    dev:       'text-purple-600 bg-purple-50 border-purple-200',
    api:       'text-gray-600 bg-gray-50 border-gray-200',
    redirect:  'text-gray-400 bg-gray-50 border-gray-200',
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
  const [openChangelog, setOpenChangelog] = useState<string | null>(CHANGELOG[0].version)

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Documentação Técnica</h1>
          <p className="text-sm text-muted-foreground mt-1">L Board — versão {VERSION}</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          BETA 0.9
        </span>
      </div>

      {/* Changelog */}
      <Section title="Histórico de Versões">
        <div className="space-y-2">
          {CHANGELOG.map((v) => (
            <Card key={v.version} className="shadow-none">
              <CardHeader
                className="cursor-pointer py-3"
                onClick={() => setOpenChangelog(openChangelog === v.version ? null : v.version)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono text-primary">v{v.version}</span>
                    <span className="text-xs text-muted-foreground">{v.date}</span>
                    {v.version === VERSION && (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">atual</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{openChangelog === v.version ? '▲' : '▼'}</span>
                </div>
              </CardHeader>
              {openChangelog === v.version && (
                <CardContent className="pt-0">
                  <ul className="space-y-1">
                    {v.changes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="text-primary shrink-0">+</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </Section>

      {/* Roles */}
      <Section title="Roles e Permissões">
        <div className="space-y-2">
          {ROLES.map((r) => (
            <Card key={r.role} className="shadow-none">
              <CardContent className="flex items-start gap-4 py-3">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0 ${r.color}`}>
                  {r.label}
                </span>
                <p className="text-xs text-muted-foreground">{r.acesso}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

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
      <Section title="Páginas, Rotas e APIs">
        <Card className="shadow-none">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Rota</th>
                  <th className="px-4 py-3 text-left font-medium">Arquivo</th>
                  <th className="px-4 py-3 text-left font-medium">Acesso</th>
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
              <CardHeader className="cursor-pointer py-3" onClick={() => setOpenService(openService === s.file ? null : s.file)}>
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
            { table: 'clients', desc: 'Clientes com receita mensal, custo operacional, status e datas.' },
            { table: 'financial_entries', desc: 'Entradas financeiras (receitas) com tipo, categoria, status e cliente.' },
            { table: 'financial_expenses', desc: 'Despesas com fornecedor, categoria, centro de custo e tipo.' },
            { table: 'tasks', desc: 'Tarefas do kanban com prioridade, status, responsável, squad e impacto em receita.' },
            { table: 'okrs', desc: 'Objetivos estratégicos com status e quarter. Relacionado com key_results (1:N).' },
            { table: 'key_results', desc: 'Resultados-chave com meta, valor atual e unidade. Cascata ao deletar OKR.' },
            { table: 'strategic_projects', desc: 'Projetos estratégicos com status, prioridade e prazo.' },
            { table: 'strategic_notes', desc: 'Notas estratégicas com conteúdo livre e tags (array).' },
            { table: 'profiles', desc: 'Perfis de usuários vinculados ao auth.users. Armazena nome, email e role (founder/developer/employee). Criado automaticamente no primeiro login.' },
            { table: 'projects', desc: 'Projetos com campos detalhados: objetivos, escopo, entregáveis, riscos, status, prioridade e datas.' },
            { table: 'project_members', desc: 'Membros de cada projeto. FK para projects e profiles. Unique por (project_id, user_id).' },
            { table: 'project_tasks', desc: 'Atividades do projeto com responsável, prazo, posição e flag de conclusão.' },
            { table: 'project_subtasks', desc: 'Sub-atividades de cada atividade com responsável, prazo e flag de conclusão. Cascata ao deletar task.' },
            { table: 'client_api_keys', desc: 'Chaves de API por cliente. Armazena encrypted_key, iv e auth_tag (AES-256-GCM). Expõe apenas key_hint (últimos 4 chars) na UI. Cascata ao deletar cliente.' },
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
          RLS ativo em todas as tabelas. Políticas por role gerenciadas via middleware e admin client.
        </p>
      </Section>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground">
        L Board v{VERSION} · Atualizado em {new Date().toLocaleDateString('pt-BR')} · Stack: Next.js + Supabase + Vercel
      </div>
    </div>
  )
}
