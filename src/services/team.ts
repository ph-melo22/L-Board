import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'

export async function getTeam(): Promise<Profile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data ?? null
}

export async function inviteTeamMember(
  full_name: string,
  email: string,
  role: UserRole = 'employee'
): Promise<void> {
  const res = await fetch('/api/team/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name, email, role }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error ?? 'Erro ao convidar membro')
  }
}

export async function removeTeamMember(id: string): Promise<void> {
  const res = await fetch(`/api/team/remove/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error ?? 'Erro ao remover membro')
  }
}

export async function updateMemberRole(id: string, role: UserRole): Promise<void> {
  const res = await fetch('/api/team/role', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, role }),
  })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error ?? 'Erro ao atualizar função')
  }
}
