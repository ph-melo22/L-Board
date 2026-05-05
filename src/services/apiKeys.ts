import type { ClientApiKey, ClientApiKeyFormData } from '@/types'

export async function getClientApiKeys(client_id: string): Promise<ClientApiKey[]> {
  const res = await fetch(`/api/clients/api-keys?client_id=${encodeURIComponent(client_id)}`)
  if (!res.ok) throw new Error('Erro ao carregar chaves de API')
  return res.json()
}

export async function createClientApiKey(formData: ClientApiKeyFormData): Promise<ClientApiKey> {
  const res = await fetch('/api/clients/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Erro ao criar chave de API')
  }
  return res.json()
}

export async function updateClientApiKey(
  id: string,
  updates: Partial<Pick<ClientApiKey, 'is_active' | 'label'>>,
): Promise<ClientApiKey> {
  const res = await fetch(`/api/clients/api-keys/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Erro ao atualizar chave de API')
  return res.json()
}

export async function deleteClientApiKey(id: string): Promise<void> {
  const res = await fetch(`/api/clients/api-keys/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erro ao remover chave de API')
}
