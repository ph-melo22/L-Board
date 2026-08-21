import { createClient } from '@/lib/supabase/client'
import type { SalesGoal, SalesGoalValues } from '@/types'

export async function getSalesGoal(userId: string): Promise<SalesGoal | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sales_goals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

/** Todas as metas da organização — RLS restringe a leitura a founder/manager. */
export async function getTeamSalesGoals(): Promise<SalesGoal[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sales_goals')
    .select('*, profiles!user_id(full_name)')

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertSalesGoal(userId: string, goals: SalesGoalValues): Promise<SalesGoal> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('organization_id').eq('id', user?.id ?? '').single()

  const { data, error } = await supabase
    .from('sales_goals')
    .upsert(
      { user_id: userId, organization_id: me?.organization_id ?? null, ...goals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select('*, profiles!user_id(full_name)')
    .single()

  if (error) throw new Error(error.message)
  return data
}
