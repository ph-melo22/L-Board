# L Board — Instruções para Claude Code

## Regra principal: documentação sempre atualizada

**Após qualquer alteração de código neste projeto, é obrigatório atualizar a documentação em `src/app/(dashboard)/docs/page.tsx`.**

Isso inclui toda mudança relevante: novas funcionalidades, correções, otimizações, novos arquivos, novos fluxos, ajustes de UX/UI, novas rotas, mudanças de infraestrutura.

---

## Como atualizar a documentação

### 1. Versão

O número de versão fica na constante `VERSION` no topo do arquivo. Regras:

- `PATCH` (0.3.0 → 0.3.1): correções de bugs, ajustes visuais, pequenas melhorias
- `MINOR` (0.3.x → 0.4.0): novas funcionalidades, novos fluxos, novas páginas
- `MAJOR` (0.x.y → 1.0.0): refatoração completa, mudança de arquitetura

### 2. Changelog

Adicione uma nova entrada no array `CHANGELOG` com:
- `version`: novo número de versão
- `date`: data atual no formato `YYYY-MM-DD`
- `changes`: lista de strings descrevendo cada mudança de forma clara e objetiva (em português)

Cada item do changelog deve:
- Começar com um verbo de ação (ex: "Adiciona", "Corrige", "Otimiza", "Remove", "Refatora")
- Ser específico o suficiente para um dev entender sem ler o código
- Mencionar arquivo/rota/componente quando relevante

### 3. Demais seções

Atualize as seções afetadas pela mudança:

| Seção | Quando atualizar |
|---|---|
| `PAGES` | Nova rota ou mudança na descrição de uma rota existente |
| `ROLES` | Mudança de permissão ou acesso por role |
| `SERVICES` | Nova função em services ou mudança de comportamento |
| `MODELS` | Novo tipo/interface ou novo campo |
| `INFRA` | Novo arquivo de infra, novo componente de layout, mudança no middleware |
| `STACK` | Nova dependência relevante adicionada ao projeto |

---

## Projeto: visão geral

**L Board** é um hub operacional interno para gestores e equipes.  
Stack: Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + Auth) · Tailwind CSS · shadcn/ui · Recharts · Vercel

### Estrutura de pastas relevante

```
src/
├── app/
│   ├── (dashboard)/          # Rotas protegidas (autenticadas)
│   │   ├── dashboard/        # Métricas e gráficos
│   │   ├── clients/          # Gestão de clientes
│   │   ├── financial/        # Entradas e despesas
│   │   ├── demands/          # Kanban de tarefas
│   │   ├── founder/          # OKRs, projetos e notas
│   │   ├── team/             # Gestão de equipe (founders only)
│   │   ├── docs/             # Documentação técnica ← SEMPRE ATUALIZAR
│   │   └── layout.tsx        # Usa DashboardShell
│   ├── auth/
│   │   ├── login/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── callback/         # Route handler PKCE
│   └── api/team/             # invite / remove / role
├── components/layout/
│   ├── DashboardShell.tsx    # Estado do menu mobile
│   ├── Sidebar.tsx           # Drawer mobile + nav por role
│   └── Header.tsx            # Hamburger + título da página
├── services/                 # Acesso ao banco (Supabase)
├── lib/supabase/             # client / server / admin
├── middleware.ts             # Auth + controle de acesso por role
└── types/index.ts            # Todos os tipos do projeto
```

### Roles

| Role | Acesso |
|---|---|
| `founder` | Tudo, incluindo /team |
| `developer` | /dashboard, /demands, /docs |
| `employee` | /dashboard, /demands |

### Variáveis de ambiente necessárias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Configuração Supabase obrigatória

No painel Supabase → Authentication → URL Configuration:
- **Site URL**: URL base do app (ex: `https://seu-app.vercel.app`)
- **Redirect URLs**: `{SITE_URL}/auth/callback`

---

## Boas práticas neste projeto

- Componentes de página são `'use client'` quando usam estado ou hooks
- Tabelas longas sempre com `overflow-x-auto` para mobile
- Grids com breakpoints: `grid-cols-1 sm:grid-cols-N` (nunca colunas fixas sem fallback mobile)
- API routes usam `createAdminClient()` para operações privilegiadas
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no client-side
- Middleware protege rotas mas API routes confiam no middleware para auth
