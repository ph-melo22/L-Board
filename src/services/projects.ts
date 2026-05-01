import { createClient } from '@/lib/supabase/client'
import type {
  Project, ProjectTask, ProjectSubtask,
  ProjectWithDetails, ProjectListItem,
  ProjectFormData, ProjectTaskFormData, ProjectSubtaskFormData,
} from '@/types'

export async function getProjects(): Promise<ProjectListItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_tasks(id, completed, project_subtasks(id, completed)), project_members(user_id)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ProjectListItem[]
}

export async function getProject(id: string): Promise<ProjectWithDetails> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_members(id, user_id), project_tasks(*, project_subtasks(*))')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  const project = data as ProjectWithDetails
  project.project_tasks = project.project_tasks.sort((a, b) => a.position - b.position)
  return project
}

export async function createProject(formData: ProjectFormData): Promise<Project> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...formData, owner_id: user?.id ?? null })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProject(id: string, formData: Partial<ProjectFormData>): Promise<Project> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .update(formData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function addProjectMember(projectId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId })
  if (error) throw new Error(error.message)
}

export async function removeProjectMember(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('project_members').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createProjectTask(formData: ProjectTaskFormData): Promise<ProjectTask> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_tasks')
    .insert(formData)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { ...data, project_subtasks: [] }
}

export async function updateProjectTask(id: string, formData: Partial<ProjectTaskFormData>): Promise<ProjectTask> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_tasks')
    .update(formData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function toggleProjectTask(id: string, completed: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('project_tasks').update({ completed }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProjectTask(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('project_tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createProjectSubtask(formData: ProjectSubtaskFormData): Promise<ProjectSubtask> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_subtasks')
    .insert(formData)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProjectSubtask(id: string, formData: Partial<ProjectSubtaskFormData>): Promise<ProjectSubtask> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_subtasks')
    .update(formData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function toggleProjectSubtask(id: string, completed: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('project_subtasks').update({ completed }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProjectSubtask(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('project_subtasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
