-- ─────────────────────────────────────────────────────────────────────────────
-- Audit Logs — cole no SQL Editor do Supabase e clique em Run
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  organization_id uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text        NOT NULL,
  target_id       text,
  metadata        jsonb,
  ip              text
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org   ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Founders podem ler os logs da própria organização
CREATE POLICY "founders_read_audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'founder'
    )
  );

-- Apenas service role pode inserir (nunca client-side)
CREATE POLICY "service_role_insert_audit_logs"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
