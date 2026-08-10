import { createClient } from '@/lib/supabase/client'
import type { CommunicationChannel, CommunicationChannelFormData, CommunicationMessage } from '@/types'

async function getMyOrganizationId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  return data?.organization_id ?? null
}

export async function getChannels(): Promise<CommunicationChannel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('communication_channels')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createChannel(formData: CommunicationChannelFormData): Promise<CommunicationChannel> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const organization_id = await getMyOrganizationId()
  const { data, error } = await supabase
    .from('communication_channels')
    .insert({ ...formData, organization_id, created_by: user?.id ?? null })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getMessages(channelId: string): Promise<CommunicationMessage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('communication_messages')
    .select('*, profiles!author_id(full_name)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function sendMessage(channelId: string, content: string): Promise<CommunicationMessage> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('communication_messages')
    .insert({ channel_id: channelId, author_id: user.id, content })
    .select('*, profiles!author_id(full_name)')
    .single()

  if (error) throw new Error(error.message)
  return data
}
