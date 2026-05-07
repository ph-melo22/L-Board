# Cybersecurity Scan Report
Data: 2026-05-07
Stack: Next.js 14, TypeScript, Supabase (PostgreSQL + Auth + RLS), Resend, Sentry, Vercel

## Sumário
- Total de checks: 90
- Passaram: 71
- Falharam: 19
- **Críticos: 3 | Altos: 4 | Médios: 7 | Baixos: 5**

---

## Achados Críticos

### [CRÍTICO] Endpoint /api/team/remove sem autenticação
Categoria: CÓDIGO / IAM
Arquivo: src/app/api/team/remove/[id]/route.ts
Encontrado: Nenhuma chamada a `requireAuth()` ou verificação de sessão antes do DELETE
Impacto: Qualquer pessoa na internet pode deletar qualquer usuário do sistema conhecendo o UUID. Ataque trivial via `DELETE /api/team/remove/<uuid>`.
Fix: Adicionar `requireAuth()` + verificar que o caller é founder da mesma organização do alvo.

---

### [CRÍTICO] Endpoint /api/team/role sem autenticação — escalada de privilégio
Categoria: CÓDIGO / IAM
Arquivo: src/app/api/team/role/route.ts
Encontrado: Nenhuma chamada a `requireAuth()` antes de alterar o campo `role` de qualquer usuário
Impacto: Qualquer atacante pode se tornar founder de qualquer organização via `PATCH /api/team/role` com `{ id: "<uuid>", role: "founder" }`. Comprometimento total do sistema.
Fix: Adicionar `requireAuth()` + checar que o caller é founder + verificar que o target pertence à mesma organização.

---

### [CRÍTICO] Endpoint /api/notify/task-assigned sem autenticação — vetor de spam/phishing
Categoria: CÓDIGO / INFRA
Arquivo: src/app/api/notify/task-assigned/route.ts
Encontrado: Nenhuma autenticação. Qualquer pessoa pode POST para este endpoint com email e conteúdo arbitrário.
Impacto: O domínio lboard.com.br pode ser usado para envio de phishing e spam ilimitado, queimando a reputação do domínio no Resend e em blocklists.
Fix: Adicionar `requireAuth()` antes de processar o envio.

---

## Achados Altos

### [ALTO] /api/team/invite sem verificação de role — qualquer usuário pode convidar
Categoria: IAM
Arquivo: src/app/api/team/invite/route.ts
Encontrado: `requireAuth()` presente mas sem checar se o caller é `founder` ou `manager`. Parâmetro `role` aceito livremente do body.
Impacto: Um colaborador autenticado pode se auto-promover ou convidar usuários com role `founder`.
Fix: Adicionar `if (profile.role !== 'founder') return 403` antes de processar o convite.

---

### [ALTO] /api/clients/api-keys sem verificação de propriedade (IDOR)
Categoria: CÓDIGO
Arquivo: src/app/api/clients/api-keys/route.ts e src/app/api/clients/api-keys/[id]/route.ts
Encontrado: GET e POST não verificam se o `client_id` pertence à organização do usuário. PATCH e DELETE não verificam se a chave pertence à org do caller.
Impacto: Usuário de org A pode ler, criar, editar e deletar API keys de clientes da org B (IDOR clássico).
Fix: Em todas as operações, filtrar por `organization_id` do caller antes de executar.

---

### [ALTO] /api/projects/[id]/ai-tasks sem verificação de propriedade do projeto
Categoria: CÓDIGO
Arquivo: src/app/api/projects/[id]/ai-tasks/route.ts
Encontrado: `requireAuth()` presente mas sem verificar se o projeto `[id]` pertence à organização do usuário.
Impacto: Usuário autenticado de qualquer org pode enviar documentos e executar IA em projetos de outras organizações, gerando custo e expondo dados.
Fix: Buscar o projeto no Supabase e verificar `project.organization_id === profile.organization_id`.

---

### [ALTO] Next.js com vulnerabilidades conhecidas (CVE)
Categoria: DEPENDÊNCIAS
Arquivo: package.json
Encontrado: 5 vulnerabilidades — 1 crítica (HTTP request smuggling), 3 altas (DoS em Server Components, cache de imagem ilimitado), 1 moderada (XSS via postcss).
Impacto: Request smuggling pode ser usado para bypass de autenticação. DoS derruba o servidor.
Fix: `npm audit fix --force` para instalar next@14.2.35.

---

## Achados Médios

### [MÉDIO] .env.example ausente
Categoria: SECRETS
Arquivo: raiz do projeto
Encontrado: Nenhum arquivo `.env.example` no repositório.
Impacto: Novos devs podem commitar `.env` real por engano ou não saber quais variáveis são necessárias.
Fix: Criar `.env.example` com todas as chaves listadas mas sem valores reais.

---

### [MÉDIO] Content-Security-Policy (CSP) ausente nos headers
Categoria: INFRA
Arquivo: next.config.mjs
Encontrado: Headers de segurança presentes (HSTS, X-Frame-Options, X-Content-Type, Referrer-Policy) mas falta `Content-Security-Policy`.
Impacto: Sem CSP, ataques XSS têm maior superfície de exploração.
Fix: Adicionar CSP restritiva em `next.config.mjs`.

---

### [MÉDIO] bodySizeLimit de 300MB em Server Actions
Categoria: INFRA
Arquivo: next.config.mjs:8
Encontrado: `bodySizeLimit: '300mb'`
Impacto: Vetor de DoS — qualquer usuário autenticado pode enviar 300MB por request, podendo esgotar memória do servidor Vercel.
Fix: Reduzir para `50mb` (máximo razoável para PDF/Word) ou aplicar por rota específica.

---

### [MÉDIO] Mensagens de erro internas expostas ao cliente
Categoria: CÓDIGO
Arquivo: todos os api routes
Encontrado: `return NextResponse.json({ error: err.message })` em vários endpoints sem sanitização.
Impacto: Stack traces, nomes de tabelas e detalhes do Supabase vazam para o cliente, facilitando reconhecimento do sistema.
Fix: Retornar mensagens genéricas ao cliente e logar o erro real no servidor (Sentry já instalado).

---

### [MÉDIO] Rate limiting ausente em /api/auth/register
Categoria: CÓDIGO / INFRA
Arquivo: src/app/api/auth/register/route.ts
Encontrado: Sem qualquer throttle ou captcha.
Impacto: Permite criação ilimitada de contas fake (spam de registro, abuso de recursos).
Fix: Adicionar rate limiting via middleware Vercel ou pacote `@upstash/ratelimit`.

---

### [MÉDIO] Sem timeout de sessão configurado explicitamente
Categoria: IAM
Encontrado: Supabase usa JWT padrão (1h), mas não há refresh forçado ou expiração de sessão inativa configurada no dashboard.
Impacto: Sessões roubadas têm janela de exploração maior.
Fix: No painel Supabase → Auth → JWT Expiry, configurar para 3600s e habilitar Refresh Token Rotation.

---

### [MÉDIO] Logs de auditoria não implementados
Categoria: LOGS
Encontrado: Sentry captura erros mas não há log estruturado de eventos de negócio (login, mudança de role, acesso a dados sensíveis, convites).
Impacto: Em caso de incidente, impossível saber quem fez o quê e quando.
Fix: Criar tabela `audit_logs` no Supabase com `user_id`, `action`, `resource`, `timestamp`.

---

## Achados Baixos

### [BAIXO] Sem .env.example no repositório para CI/CD
Categoria: SECRETS
Fix: Adicionar `.env.example` para documentar variáveis necessárias.

### [BAIXO] Permissões-Policy incompleta
Categoria: INFRA
Arquivo: next.config.mjs
Encontrado: Faltam `payment=()`, `usb=()`, `accelerometer=()` na Permissions-Policy.
Fix: Expandir a diretiva para bloquear APIs não utilizadas.

### [BAIXO] Sem SBOM gerado
Categoria: DEPENDÊNCIAS
Fix: Adicionar `npm sbom --packageLockOnly` ao pipeline de CI para rastrear supply chain.

### [BAIXO] Backup do banco não verificado
Categoria: BACKUP
Encontrado: Supabase Pro tem backup diário automático, mas sem verificação de restauração documentada.
Fix: Testar restore trimestral e documentar RTO/RPO.

### [BAIXO] Sem Runbook de Disaster Recovery escrito
Categoria: BACKUP
Fix: Criar documento com passos para restaurar o sistema em caso de falha total.

---

## Categorias que Passaram ✓

- Secrets: nenhuma API key hardcoded no código-fonte
- .gitignore: `.env` e `.env*.local` corretamente ignorados
- Supabase service_role: usado apenas no servidor (lib/supabase/admin.ts), nunca no client
- AES-256-GCM: implementado para criptografia de API keys dos clientes
- HSTS: configurado com `max-age=63072000; includeSubDomains; preload`
- X-Frame-Options: DENY configurado
- X-Content-Type-Options: nosniff configurado
- X-XSS-Protection: configurado
- Referrer-Policy: strict-origin-when-cross-origin
- Source maps: ocultos via Sentry hideSourceMaps
- Middleware de auth: protege todas as rotas do dashboard corretamente
- Role-based access: ROLE_ALLOWED map no middleware funcionando
- /api/settings/ai-keys: autenticação + verificação de role founder + org ownership corretos
- /api/auth/register: endpoint público correto, sem exposição de dados sensíveis críticos
- Git history: sem secrets commitados nos últimos 20 commits
- Sem console.log com dados sensíveis no código-fonte
- Sentry: instalado para monitoramento de erros em produção

---

## Plano de Ação

| Prioridade | Item | Esforço |
|---|---|---|
| 🔴 Hoje | Adicionar auth em /team/remove, /team/role, /notify/task-assigned | 15 min |
| 🔴 Hoje | Adicionar role check em /team/invite | 5 min |
| 🔴 Hoje | Atualizar Next.js para 14.2.35 | 5 min |
| 🟠 Semana | Corrigir IDOR em /clients/api-keys e /projects/ai-tasks | 30 min |
| 🟠 Semana | Adicionar CSP header | 15 min |
| 🟠 Semana | Sanitizar mensagens de erro ao cliente | 20 min |
| 🟡 Sprint | Criar .env.example | 5 min |
| 🟡 Sprint | Reduzir bodySizeLimit para 50mb | 2 min |
| 🟡 Sprint | Rate limiting no registro | 30 min |
