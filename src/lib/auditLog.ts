import { createAdminClient } from '@/lib/supabase/admin'

interface AuditEntry {
  actor_id: string | null
  organization_id: string | null
  action: string
  target_id?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
}

export function auditLog(entry: AuditEntry): void {
  void createAdminClient()
    .from('audit_logs')
    .insert(entry)
    .then(() => undefined)
}
