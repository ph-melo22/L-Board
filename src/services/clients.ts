import { createClient } from '@/lib/supabase/client'
import type { Client, ClientFormData, ClientWithProfit } from '@/types'
import { calculateMargin, calculateProfit } from '@/lib/utils'

export async function getClients(): Promise<ClientWithProfit[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((c: Client) => ({
    ...c,
    profit: calculateProfit(c.monthly_revenue, c.operational_cost),
    margin: calculateMargin(c.monthly_revenue, c.operational_cost),
  }))
}

export async function getClientById(id: string): Promise<ClientWithProfit | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null

  return {
    ...data,
    profit: calculateProfit(data.monthly_revenue, data.operational_cost),
    margin: calculateMargin(data.monthly_revenue, data.operational_cost),
  }
}

export async function createClient_(formData: ClientFormData): Promise<Client> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert(formData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateClient(id: string, formData: Partial<ClientFormData>): Promise<Client> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getClientOptions(): Promise<Pick<Client, 'id' | 'name'>[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('status', 'active')
    .order('name')

  if (error) return []
  return data ?? []
}
