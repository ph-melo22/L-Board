-- ─────────────────────────────────────────────────────────────────────────────
-- L Board — Cria os profiles das 6 contas de teste (uma por role)
-- Rode DEPOIS de criar os 6 usuários em Authentication > Users > Add user
-- (com "Auto Confirm User" marcado, mesmos e-mails abaixo).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO profiles (id, full_name, email, role, organization_id)
SELECT u.id, 'Teste Founder', u.email, 'founder', (SELECT organization_id FROM profiles WHERE role = 'founder' LIMIT 1)
FROM auth.users u WHERE u.email = 'teste.founder@lboard.test'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO profiles (id, full_name, email, role, organization_id)
SELECT u.id, 'Teste Gestor', u.email, 'manager', (SELECT organization_id FROM profiles WHERE role = 'founder' LIMIT 1)
FROM auth.users u WHERE u.email = 'teste.manager@lboard.test'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO profiles (id, full_name, email, role, organization_id)
SELECT u.id, 'Teste Financeiro', u.email, 'financial', (SELECT organization_id FROM profiles WHERE role = 'founder' LIMIT 1)
FROM auth.users u WHERE u.email = 'teste.financial@lboard.test'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO profiles (id, full_name, email, role, organization_id)
SELECT u.id, 'Teste Developer', u.email, 'developer', (SELECT organization_id FROM profiles WHERE role = 'founder' LIMIT 1)
FROM auth.users u WHERE u.email = 'teste.developer@lboard.test'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO profiles (id, full_name, email, role, organization_id)
SELECT u.id, 'Teste Funcionário', u.email, 'employee', (SELECT organization_id FROM profiles WHERE role = 'founder' LIMIT 1)
FROM auth.users u WHERE u.email = 'teste.employee@lboard.test'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO profiles (id, full_name, email, role, organization_id)
SELECT u.id, 'Teste Vendedor', u.email, 'sales', (SELECT organization_id FROM profiles WHERE role = 'founder' LIMIT 1)
FROM auth.users u WHERE u.email = 'teste.vendedor@lboard.test'
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Confere o resultado
SELECT full_name, email, role FROM profiles WHERE email LIKE 'teste.%@lboard.test' ORDER BY role;
