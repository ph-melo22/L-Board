-- ─────────────────────────────────────────────────────────────────────────────
-- L Board — Schema completo
-- Cole tudo isso no SQL Editor do Supabase e clique em Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Clients ─────────────────────────────────────────────────────────────────

CREATE TABLE clients (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  product          text        NOT NULL,
  monthly_revenue  numeric     NOT NULL DEFAULT 0,
  operational_cost numeric     NOT NULL DEFAULT 0,
  start_date       date        NOT NULL,
  renewal_date     date,
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'inactive', 'churned', 'trial')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── Financial Entries ────────────────────────────────────────────────────────

CREATE TABLE financial_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        REFERENCES clients(id) ON DELETE SET NULL,
  value       numeric     NOT NULL DEFAULT 0,
  type        text        NOT NULL CHECK (type IN ('recurring', 'one_time', 'upsell')),
  category    text        NOT NULL CHECK (category IN ('subscription', 'consulting', 'implementation', 'support', 'other')),
  status      text        NOT NULL DEFAULT 'confirmed'
                          CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  date        date        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Financial Expenses ───────────────────────────────────────────────────────

CREATE TABLE financial_expenses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier    text        NOT NULL,
  category    text        NOT NULL CHECK (category IN ('infrastructure', 'payroll', 'marketing', 'tools', 'office', 'taxes', 'other')),
  cost_center text,
  value       numeric     NOT NULL DEFAULT 0,
  type        text        NOT NULL CHECK (type IN ('fixed', 'variable', 'investment')),
  date        date        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text        NOT NULL,
  description          text,
  client_id            uuid        REFERENCES clients(id) ON DELETE SET NULL,
  squad                text,
  responsible          text,
  priority             text        NOT NULL DEFAULT 'medium'
                                   CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  impacts_revenue      boolean     NOT NULL DEFAULT false,
  revenue_impact_value numeric,
  due_date             date,
  status               text        NOT NULL DEFAULT 'backlog'
                                   CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── OKRs ────────────────────────────────────────────────────────────────────

CREATE TABLE okrs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  objective  text        NOT NULL,
  status     text        NOT NULL DEFAULT 'on_track'
                         CHECK (status IN ('on_track', 'at_risk', 'off_track', 'completed')),
  quarter    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Key Results ─────────────────────────────────────────────────────────────

CREATE TABLE key_results (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id      uuid        NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  description text        NOT NULL,
  target      numeric     NOT NULL DEFAULT 100,
  current     numeric     NOT NULL DEFAULT 0,
  unit        text        NOT NULL DEFAULT '%',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Strategic Projects ───────────────────────────────────────────────────────

CREATE TABLE strategic_projects (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'planning'
                          CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  priority    text        NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low', 'medium', 'high')),
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Strategic Notes ──────────────────────────────────────────────────────────

CREATE TABLE strategic_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  content    text        NOT NULL DEFAULT '',
  tags       text[]      NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Profiles (Team / Roles) ─────────────────────────────────────────────────
-- Linked to auth.users. Created automatically on first login (middleware) or
-- pre-created when the founder invites a team member via the API.

CREATE TABLE profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  role       text        NOT NULL DEFAULT 'employee'
                         CHECK (role IN ('founder', 'employee', 'developer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Apenas usuários autenticados têm acesso. O app é single-tenant (founder only).

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_notes    ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can read all; each user can insert/update their own row
CREATE POLICY "profiles_read"        ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "auth_full_access" ON clients           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON financial_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON financial_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON tasks              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON okrs               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON key_results        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON strategic_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON strategic_notes    FOR ALL TO authenticated USING (true) WITH CHECK (true);
