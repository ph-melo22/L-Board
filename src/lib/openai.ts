import OpenAI from 'openai'
import { decrypt } from '@/lib/crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getOpenAIClient(supabase: SupabaseClient): Promise<OpenAI> {
  try {
    const { data: orgKey } = await supabase
      .from('organization_api_keys')
      .select('encrypted_key, iv, auth_tag')
      .eq('provider', 'openai')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (orgKey) {
      const apiKey = decrypt(orgKey.encrypted_key, orgKey.iv, orgKey.auth_tag)
      return new OpenAI({ apiKey })
    }
  } catch { /* fall through */ }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}
