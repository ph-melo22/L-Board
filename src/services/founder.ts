import { createClient } from '@/lib/supabase/client'
import type { OKR, KeyResult, StrategicProject, StrategicNote } from '@/types'

// ─── OKRs ─────────────────────────────────────────────────────────────────────

export async function getOKRs(): Promise<OKR[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('okrs')
    .select('*, key_results(*)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createOKR(okr: Omit<OKR, 'id' | 'created_at' | 'key_results'>): Promise<OKR> {
  const supabase = createClient()
  const { data, error } = await supabase.from('okrs').insert(okr).select().single()
  if (error) throw new Error(error.message)
  return { ...data, key_results: [] }
}

export async function updateOKR(id: string, okr: Partial<Omit<OKR, 'id' | 'created_at' | 'key_results'>>): Promise<OKR> {
  const supabase = createClient()
  const { data, error } = await supabase.from('okrs').update(okr).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteOKR(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('okrs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Strategic Projects ───────────────────────────────────────────────────────

export async function getProjects(): Promise<StrategicProject[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('strategic_projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createProject(project: Omit<StrategicProject, 'id' | 'created_at'>): Promise<StrategicProject> {
  const supabase = createClient()
  const { data, error } = await supabase.from('strategic_projects').insert(project).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProject(id: string, project: Partial<Omit<StrategicProject, 'id' | 'created_at'>>): Promise<StrategicProject> {
  const supabase = createClient()
  const { data, error } = await supabase.from('strategic_projects').update(project).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('strategic_projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Key Results ─────────────────────────────────────────────────────────────

export async function createKeyResult(
  okrId: string,
  kr: { description: string; target: number; current: number; unit: string }
): Promise<KeyResult> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('key_results')
    .insert({ okr_id: okrId, ...kr })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateKeyResult(
  id: string,
  kr: Partial<{ description: string; target: number; current: number; unit: string }>
): Promise<KeyResult> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('key_results')
    .update(kr)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteKeyResult(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('key_results').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Strategic Notes ──────────────────────────────────────────────────────────

export async function getNotes(): Promise<StrategicNote[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('strategic_notes')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function upsertNote(note: Omit<StrategicNote, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<StrategicNote> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('strategic_notes')
    .upsert({ ...note, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('strategic_notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
