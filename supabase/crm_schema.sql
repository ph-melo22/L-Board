

-- ─────────────────────────────────────────────────────────────────────────────
-- L Board — CRM Kanban (leads)
-- Cole tudo isso no SQL Editor do Supabase e clique em Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Leads ─────────────────────────────────────────────────────────────────

CREATE TABLE crm_leads (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id            uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  name                text        NOT NULL,
  company             text,
  role_title          text,
  email               text,
  phone               text,
  stage               text        NOT NULL DEFAULT 'novo'
                                  CHECK (stage IN ('novo', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido')),
  source              text,
  product_interest    text,
  deal_value          numeric     NOT NULL DEFAULT 0,
  win_probability     integer,
  expected_close_date date,
  loss_reason         text,
  industry            text,
  company_size        text,
  priority            text        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  tags                text[]      NOT NULL DEFAULT '{}',
  client_id           uuid        REFERENCES clients(id) ON DELETE SET NULL,
  next_follow_up_date date,
  last_interaction_at timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── Interações (timeline: notas, ligações, e-mails, reuniões, mudanças de estágio) ──

CREATE TABLE crm_lead_interactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid        NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  author_id  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  type       text        NOT NULL DEFAULT 'note'
                         CHECK (type IN ('note', 'call', 'email', 'meeting', 'stage_change')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Mensagens do chat de IA (por lead) ───────────────────────────────────────

CREATE TABLE crm_lead_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid        NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Follow-ups aparecem também no Kanban de Demandas ─────────────────────────

ALTER TABLE tasks ADD COLUMN lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL;

-- ─── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_crm_leads_org         ON crm_leads(organization_id, stage);
CREATE INDEX idx_crm_leads_owner       ON crm_leads(owner_id);
CREATE INDEX idx_crm_lead_interactions ON crm_lead_interactions(lead_id, created_at DESC);
CREATE INDEX idx_crm_lead_messages     ON crm_lead_messages(lead_id, created_at);
CREATE INDEX idx_tasks_lead            ON tasks(lead_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Acesso ao módulo: founder, manager, developer, employee, sales (financial não entra).
-- Visibilidade da linha: dono do lead (owner_id) sempre vê o próprio; founder/manager veem todos.

ALTER TABLE crm_leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_interactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_leads_access" ON crm_leads FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
        AND p.organization_id = crm_leads.organization_id
        AND p.role IN ('founder', 'manager', 'developer', 'employee', 'sales')
        AND (p.role IN ('founder', 'manager') OR crm_leads.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
        AND p.organization_id = crm_leads.organization_id
        AND p.role IN ('founder', 'manager', 'developer', 'employee', 'sales')
        AND (p.role IN ('founder', 'manager') OR crm_leads.owner_id = auth.uid())
    )
  );

-- Interações e mensagens seguem o acesso do lead pai — o subselect em crm_leads
-- já aplica a RLS acima, então basta checar que o lead_id pertence ao conjunto
-- de leads visíveis ao usuário atual.
CREATE POLICY "crm_lead_interactions_access" ON crm_lead_interactions FOR ALL TO authenticated
  USING (lead_id IN (SELECT id FROM crm_leads))
  WITH CHECK (lead_id IN (SELECT id FROM crm_leads));

CREATE POLICY "crm_lead_messages_access" ON crm_lead_messages FOR ALL TO authenticated
  USING (lead_id IN (SELECT id FROM crm_leads))
  WITH CHECK (lead_id IN (SELECT id FROM crm_leads));
