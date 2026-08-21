

-- ─────────────────────────────────────────────────────────────────────────────
-- L Board — Metas individuais de vendedor + data de fechamento do lead
-- Cole tudo isso no SQL Editor do Supabase e clique em Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── crm_leads.closed_at ────────────────────────────────────────────────────
-- Data em que o lead entrou no estágio "ganho" (services/crm.ts::moveLeadStage
-- seta isso a cada troca de estágio: preenche ao virar "ganho", limpa se sair
-- de "ganho"). Usado para calcular o valor fechado por vendedor em cada
-- período (dia/semana/mês/semestre) na aba Equipe do CRM e em /comercial.

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- ─── Metas individuais ──────────────────────────────────────────────────────
-- Uma linha por vendedor (user_id), definida pelo founder/manager. O próprio
-- vendedor só lê a linha dele (para ver a meta em /comercial); não pode criar
-- nem editar.

CREATE TABLE sales_goals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily           numeric     NOT NULL DEFAULT 0,
  weekly          numeric     NOT NULL DEFAULT 0,
  monthly         numeric     NOT NULL DEFAULT 0,
  semester        numeric     NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_sales_goals_org ON sales_goals(organization_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Leitura: o próprio vendedor vê a própria meta; founder/manager veem todas as
-- da organização. Escrita: só founder/manager (quem define a meta é a gestão).

ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_goals_select" ON sales_goals FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
        AND p.organization_id = sales_goals.organization_id
        AND p.role IN ('founder', 'manager')
    )
  );

CREATE POLICY "sales_goals_write" ON sales_goals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
        AND p.organization_id = sales_goals.organization_id
        AND p.role IN ('founder', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
        AND p.organization_id = sales_goals.organization_id
        AND p.role IN ('founder', 'manager')
    )
  );
