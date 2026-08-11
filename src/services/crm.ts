import { createClient } from '@/lib/supabase/client'
import type { CrmLead, CrmLeadFormData, CrmLeadStage, CrmLeadInteraction, CrmLeadInteractionType, Task } from '@/types'

async function getMyOrganizationId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  return data?.organization_id ?? null
}

export async function getLeads(): Promise<CrmLead[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*, profiles!owner_id(full_name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getLead(id: string): Promise<CrmLead | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*, profiles!owner_id(full_name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createLead(formData: CrmLeadFormData): Promise<CrmLead> {
  const supabase = createClient()
  const organization_id = await getMyOrganizationId()
  const { data, error } = await supabase
    .from('crm_leads')
    .insert({ ...formData, organization_id })
    .select('*, profiles!owner_id(full_name)')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateLead(id: string, formData: Partial<CrmLeadFormData>): Promise<CrmLead> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_leads')
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, profiles!owner_id(full_name)')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('crm_leads').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function moveLeadStage(id: string, stage: CrmLeadStage, lossReason?: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = { stage, updated_at: now, last_interaction_at: now }
  if (stage === 'perdido') updates.loss_reason = lossReason ?? null

  const { error } = await supabase.from('crm_leads').update(updates).eq('id', id)
  if (error) throw new Error(error.message)

  await supabase.from('crm_lead_interactions').insert({
    lead_id: id,
    author_id: user?.id ?? null,
    type: 'stage_change',
    content: `Estágio alterado para "${stage}"${stage === 'perdido' && lossReason ? ` — motivo: ${lossReason}` : ''}`,
  })
}

export async function getLeadInteractions(leadId: string): Promise<CrmLeadInteraction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_lead_interactions')
    .select('*, profiles!author_id(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function addLeadInteraction(
  leadId: string,
  type: CrmLeadInteractionType,
  content: string
): Promise<CrmLeadInteraction> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('crm_lead_interactions')
    .insert({ lead_id: leadId, author_id: user?.id ?? null, type, content })
    .select('*, profiles!author_id(full_name)')
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('crm_leads').update({ last_interaction_at: now }).eq('id', leadId)

  return data
}

export async function getLeadFollowUpTasks(leadId: string): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('lead_id', leadId)
    .order('due_date', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createFollowUpTask(
  leadId: string,
  form: { title: string; due_date: string; priority?: Task['priority'] }
): Promise<Task> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: form.title,
      due_date: form.due_date,
      priority: form.priority ?? 'medium',
      status: 'todo',
      lead_id: leadId,
      client_id: null,
      squad: null,
      responsible: null,
      description: null,
      impacts_revenue: false,
      revenue_impact_value: null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
