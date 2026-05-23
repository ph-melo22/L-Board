<div align="center">

# L Board

**Hub operacional interno para gestores e equipes de agências e startups**

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

</div>

---

## Sobre o projeto

O **L Board** é uma plataforma SaaS de gestão operacional voltada para fundadores e equipes de agências e startups brasileiras. Centraliza em um único lugar o controle de clientes, demandas, financeiro, OKRs, projetos estratégicos e equipe — com uma assistente de IA integrada que analisa os dados em tempo real e executa ações diretamente na plataforma.

---

## O problema que o L Board resolve

Gestores de agências e startups brasileiras lidam diariamente com informação espalhada em dezenas de ferramentas — planilhas no Google Sheets, tarefas no Notion, financeiro no Excel, clientes no WhatsApp e métricas sem lugar fixo. O resultado é perda de tempo, decisões baseadas em dados desatualizados e equipes desalinhadas.

| Dor | Como o L Board resolve |
|---|---|
| **"Não sei quanto estou faturando esse mês"** | Dashboard financeiro em tempo real com entradas, despesas e resultado líquido do mês atual |
| **"Não sei o status das demandas da equipe"** | Kanban completo com prioridade, responsável, prazo e filtros — tudo em um lugar |
| **"Perco horas em reunião de alinhamento"** | Cada membro acessa apenas o que precisa — o founder vê tudo, o developer só vê demandas e docs |
| **"Não consigo acompanhar meus OKRs"** | Founder Board com OKRs, key results com progresso numérico e projetos estratégicos |
| **"Preciso de contexto rápido sobre o negócio"** | Assistente de IA (Layla) com acesso a todos os dados da organização em tempo real — faz perguntas e ela responde com base nos seus dados reais |
| **"Perco tempo criando tarefas manualmente"** | A IA cria demandas, atualiza status e cria projetos estratégicos via conversa, com confirmação antes de executar |
| **"Difícil controlar quem tem acesso ao quê"** | Sistema de roles com 5 níveis — cada colaborador vê apenas o que é relevante para ele |
| **"Convidar alguém novo é trabalhoso"** | Convite por e-mail em um clique — o membro recebe o link, define a senha e já entra na organização certa |
| **"Tenho clientes com contratos e receitas diferentes"** | Módulo de clientes com perfil individual, status e receita mensal por cliente |
| **"Minha equipe é brasileira mas atendo clientes internacionais"** | Interface disponível em 6 idiomas com troca instantânea |

---

## Funcionalidades

### Dashboard
- Métricas e gráficos em tempo real (receita, despesas, clientes ativos, demandas)
- Visão geral do mês atual com comparativo

### Clientes
- Cadastro e gestão completa de clientes
- Perfil individual com histórico e status
- Controle de receita mensal por cliente

### Financeiro
- Lançamento de entradas e despesas
- Filtros por período e categoria
- Resultado líquido do mês

### Demandas (Kanban)
- Board com colunas: Backlog → To Do → Em Progresso → Revisão → Concluído
- Prioridade, responsável e prazo por tarefa
- Filtros por status e prioridade

### Founder Board
- OKRs com key results e progresso
- Projetos estratégicos com status e prazo
- Notas do fundador

### Assistente de IA (Layla)
- Acesso a todos os dados operacionais da organização em tempo real
- **Tool Use com OpenAI GPT-4o** — a IA pode criar demandas, atualizar status e criar projetos estratégicos diretamente no banco
- Histórico de conversa por sessão
- Suporte a GPT-4o e GPT-4o-mini
- Chave de API configurável por organização (armazenada criptografada)

### Equipe
- Convite de membros por e-mail (template HTML customizado via Resend)
- Controle de roles: `founder`, `manager`, `financial`, `developer`, `employee`
- Remoção e alteração de roles em tempo real

### Configurações
- Gerenciamento de chaves de API de IA por organização
- Preferências da organização

---

## Arquitetura & Decisões Técnicas

```
src/
├── app/
│   ├── (dashboard)/        # Rotas protegidas — Server + Client Components
│   ├── auth/               # Login, registro, reset de senha, callback PKCE
│   └── api/                # API Routes (backend serverless)
│       ├── assistant/      # Agente de IA com tool use
│       ├── auth/           # Registro de usuários
│       ├── team/           # Convite, remoção e roles
│       ├── settings/       # Configurações e chaves de API
│       └── notify/         # Notificações por e-mail
├── components/
│   ├── layout/             # DashboardShell, Sidebar, Header
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── supabase/           # client / server / admin
│   ├── crypto.ts           # Criptografia AES-256-GCM
│   ├── rateLimit.ts        # Rate limiting em memória
│   ├── auditLog.ts         # Log de auditoria
│   ├── email.ts            # Envio de e-mails via Resend
│   └── requireAuth.ts      # Guard de autenticação para API Routes
├── services/               # Camada de acesso ao banco (Supabase queries)
├── middleware.ts           # Auth + controle de acesso por role + CSP
└── types/index.ts          # Todos os tipos TypeScript
```

### Por que essas escolhas?

| Decisão | Motivo |
|---|---|
| Next.js App Router | Server Components reduzem bundle e permitem queries diretas ao banco sem expor endpoints |
| Supabase (BaaS) | PostgreSQL + Auth + RLS em um só lugar, sem servidor dedicado |
| PKCE (sem OAuth implícito) | Fluxo de autenticação mais seguro, resistente a interceptação |
| AES-256-GCM para chaves de API | Chaves de terceiros nunca ficam em texto puro no banco |
| Tool Use (OpenAI function calling) | A IA não apenas responde — ela pode executar ações reais com confirmação do usuário |
| CSP com nonce por request | Proteção contra XSS em nível de infraestrutura, não apenas sanitização |

---

## Segurança

- **Row Level Security (RLS)** no Supabase — cada query respeita o JWT do usuário
- **Middleware** valida autenticação e role antes de qualquer rota
- **Rate limiting** nas rotas críticas (assistente: 30 req/min, convites: 5 req/min)
- **Audit log** de todas as ações privilegiadas
- **CSP dinâmica** com nonce único por request
- **Service Role Key** usada apenas server-side, nunca exposta ao client
- **Sanitização de HTML** nos templates de e-mail

---

## Stack

### Frontend
- [Next.js 15](https://nextjs.org/) — App Router
- [React 19](https://react.dev/)
- [TypeScript 5](https://www.typescriptlang.org/)
- [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/) — componentes acessíveis
- [Framer Motion](https://www.framer.com/motion/) — animações
- [Recharts](https://recharts.org/) — gráficos
- [Lucide React](https://lucide.dev/) — ícones
- [next-intl](https://next-intl-docs.vercel.app/) — i18n (6 idiomas)
- [next-themes](https://github.com/pacocoursey/next-themes) — dark/light mode

### Backend & Banco
- [Supabase](https://supabase.com/) — PostgreSQL + Auth + RLS
- Next.js API Routes — endpoints serverless

### Integrações
- [OpenAI SDK](https://platform.openai.com/) — GPT-4o com tool use
- [Resend](https://resend.com/) — e-mails transacionais
- [Sentry](https://sentry.io/) — monitoramento de erros
- [Vercel Analytics](https://vercel.com/analytics) — analytics

### Utilitários
- [date-fns](https://date-fns.org/) — manipulação de datas
- [mammoth](https://github.com/mwilliamson/mammoth.js/) — extração de texto de `.docx`
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) — extração de texto de `.pdf`

---

## Como rodar localmente

### Pré-requisitos
- Node.js 20+
- Conta no [Supabase](https://supabase.com/)
- Conta na [OpenAI](https://platform.openai.com/) (opcional)
- Conta no [Resend](https://resend.com/) (opcional, para e-mails)

### 1. Clone o repositório

```bash
git clone https://github.com/ph-melo22/L-Board.git
cd L-Board
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha o arquivo `.env.local` com suas credenciais (veja a seção abaixo).

### 4. Configure o Supabase

No painel do Supabase → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

### 5. Gere a chave de criptografia

```bash
openssl rand -hex 32
```

Cole o resultado em `ENCRYPTION_KEY` no `.env.local`.

### 6. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de ambiente

Veja o arquivo [`.env.example`](.env.example) para a lista completa. As obrigatórias são:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (apenas server-side) |
| `ENCRYPTION_KEY` | 32 bytes hex para AES-256-GCM (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | URL base da aplicação |

---

## Roles e Permissões

| Role | Rotas disponíveis |
|---|---|
| `founder` | Tudo — dashboard, clients, financial, demands, founder, team, projects, settings, docs, contador |
| `manager` | dashboard, clients, demands, projects |
| `financial` | dashboard, financial, contador, clients |
| `developer` | dashboard, demands, docs, projects |
| `employee` | dashboard, demands, projects |

---

## Deploy

O projeto está configurado para deploy automático na **Vercel**. Qualquer push na branch `main` dispara um novo deploy.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ph-melo22/L-Board)

---

## Autor

**Pedro Henrique Melo**

[![GitHub](https://img.shields.io/badge/GitHub-ph--melo22-181717?style=flat&logo=github)](https://github.com/ph-melo22)
