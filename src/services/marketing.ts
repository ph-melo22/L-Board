import { createClient } from '@/lib/supabase/client'
import type { MarketingCampaign, MarketingCampaignFormData, MarketingSummary } from '@/types'

async function getMyOrganizationId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  return data?.organization_id ?? null
}

export async function getCampaigns(): Promise<MarketingCampaign[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCampaign(formData: MarketingCampaignFormData): Promise<MarketingCampaign> {
  const supabase = createClient()
  const organization_id = await getMyOrganizationId()
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({ ...formData, organization_id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateCampaign(id: string, formData: Partial<MarketingCampaignFormData>): Promise<MarketingCampaign> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('marketing_campaigns')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteCampaign(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function summarizeCampaigns(campaigns: MarketingCampaign[]): MarketingSummary {
  const totalInvestment = campaigns.reduce((acc, c) => acc + c.investment, 0)
  const totalTraffic = campaigns.reduce((acc, c) => acc + c.traffic, 0)
  const totalLeads = campaigns.reduce((acc, c) => acc + c.leads_generated, 0)
  const totalConversions = campaigns.reduce((acc, c) => acc + c.conversions, 0)
  const totalRevenue = campaigns.reduce((acc, c) => acc + c.revenue_generated, 0)

  const cac = totalConversions > 0 ? totalInvestment / totalConversions : 0
  const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0
  const conversionRate = totalTraffic > 0 ? (totalConversions / totalTraffic) * 100 : 0

  const byChannelMap = new Map<string, { investment: number; revenue: number }>()
  for (const c of campaigns) {
    const entry = byChannelMap.get(c.channel) ?? { investment: 0, revenue: 0 }
    entry.investment += c.investment
    entry.revenue += c.revenue_generated
    byChannelMap.set(c.channel, entry)
  }
  const byChannel = Array.from(byChannelMap.entries()).map(([channel, v]) => ({
    channel: channel as MarketingCampaign['channel'],
    investment: v.investment,
    revenue: v.revenue,
  }))

  return { totalInvestment, totalTraffic, totalLeads, totalConversions, totalRevenue, cac, roi, conversionRate, byChannel }
}
