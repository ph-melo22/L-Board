export interface CrmChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface CrmToolCall {
  type: string
  params: Record<string, unknown>
}

export interface CrmChatResponse {
  reply: string
  tool_calls: CrmToolCall[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface CrmActionResult {
  success: boolean
  message: string
}

export async function getLeadChatHistory(leadId: string): Promise<CrmChatMessage[]> {
  const res = await fetch(`/api/crm/assistant?lead_id=${encodeURIComponent(leadId)}`)
  if (!res.ok) return []
  return res.json()
}

export async function clearLeadChat(leadId: string): Promise<void> {
  await fetch(`/api/crm/assistant?lead_id=${encodeURIComponent(leadId)}`, { method: 'DELETE' })
}

export async function sendLeadChatMessage(
  leadId: string,
  message: string,
  model: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<CrmChatResponse> {
  const res = await fetch('/api/crm/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: leadId, message, model, history }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erro ao conversar com a IA')
  return data
}

export async function executeLeadAction(leadId: string, action: CrmToolCall): Promise<CrmActionResult> {
  const res = await fetch('/api/crm/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: leadId, execute_action: action }),
  })
  return res.json()
}
