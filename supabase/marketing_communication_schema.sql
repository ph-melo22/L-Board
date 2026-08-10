-- ─────────────────────────────────────────────────────────────────────────────
-- L Board — Marketing e Comunicação
-- Cole tudo isso no SQL Editor do Supabase e clique em Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Marketing Campaigns ────────────────────────────────────────────────────

CREATE TABLE marketing_campaigns (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  channel           text        NOT NULL DEFAULT 'other'
                                CHECK (channel IN ('paid_search', 'paid_social', 'seo', 'content', 'email', 'referral', 'other')),
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  start_date        date,
  end_date          date,
  investment        numeric     NOT NULL DEFAULT 0,
  traffic           integer     NOT NULL DEFAULT 0,
  leads_generated   integer     NOT NULL DEFAULT 0,
  conversions       integer     NOT NULL DEFAULT 0,
  revenue_generated numeric     NOT NULL DEFAULT 0,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_campaigns_org ON marketing_campaigns(organization_id, created_at DESC);

-- ─── Communication Channels ───────────────────────────────────────────────────

CREATE TABLE communication_channels (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  created_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- ─── Communication Messages ───────────────────────────────────────────────────

CREATE TABLE communication_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid        NOT NULL REFERENCES communication_channels(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_communication_messages_channel ON communication_messages(channel_id, created_at);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Restrito a founder/manager da própria organização (a UI e o middleware também
-- restringem por role, mas a RLS garante isso mesmo se a API for chamada direto).

ALTER TABLE marketing_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_managers_full_access" ON marketing_campaigns FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'manager')
    )
  );

CREATE POLICY "founders_managers_full_access" ON communication_channels FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'manager')
    )
  );

CREATE POLICY "founders_managers_read_write" ON communication_messages FOR ALL TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM communication_channels WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'manager')
      )
    )
  )
  WITH CHECK (
    author_id = auth.uid()
    AND channel_id IN (
      SELECT id FROM communication_channels WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('founder', 'manager')
      )
    )
  );
