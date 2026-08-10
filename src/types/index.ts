// ─── Client ───────────────────────────────────────────────────────────────────

export type ClientStatus = 'active' | 'inactive' | 'churned' | 'trial'

export interface Client {
  id: string
  name: string
  product: string
  monthly_revenue: number
  operational_cost: number
  start_date: string
  renewal_date: string | null
  status: ClientStatus
  created_at: string
}

export interface ClientWithProfit extends Client {
  profit: number
  margin: number
}

export type ClientFormData = Omit<Client, 'id' | 'created_at'>

// ─── Financial Entries ────────────────────────────────────────────────────────

export type FinancialEntryType = 'recurring' | 'one_time' | 'upsell'
export type FinancialEntryStatus = 'confirmed' | 'pending' | 'cancelled'
export type FinancialEntryCategory =
  | 'subscription'
  | 'consulting'
  | 'implementation'
  | 'support'
  | 'other'

export interface FinancialEntry {
  id: string
  client_id: string | null
  value: number
  type: FinancialEntryType
  category: FinancialEntryCategory
  status: FinancialEntryStatus
  date: string
  description: string | null
  created_at: string
  clients?: Pick<Client, 'id' | 'name'>
}

export type FinancialEntryFormData = Omit<FinancialEntry, 'id' | 'created_at' | 'clients'>

// ─── Financial Expenses ───────────────────────────────────────────────────────

export type ExpenseType = 'fixed' | 'variable' | 'investment'
export type ExpenseCategory =
  | 'infrastructure'
  | 'payroll'
  | 'marketing'
  | 'tools'
  | 'office'
  | 'taxes'
  | 'other'
export type ExpenseNature = 'cogs' | 'opex' | 'da'

export interface FinancialExpense {
  id: string
  supplier: string
  category: ExpenseCategory
  cost_center: string | null
  value: number
  type: ExpenseType
  nature?: ExpenseNature
  date: string
  description: string | null
  created_at: string
}

export type FinancialExpenseFormData = Omit<FinancialExpense, 'id' | 'created_at'>

// ─── Tasks / Demands ──────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'

export interface Task {
  id: string
  title: string
  description: string | null
  client_id: string | null
  squad: string | null
  responsible: string | null
  priority: TaskPriority
  impacts_revenue: boolean
  revenue_impact_value: number | null
  due_date: string | null
  status: TaskStatus
  created_at: string
  clients?: Pick<Client, 'id' | 'name'>
}

export type TaskFormData = Omit<Task, 'id' | 'created_at' | 'clients'>

// ─── Founder Board ────────────────────────────────────────────────────────────

export type OKRStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed'

export interface OKR {
  id: string
  objective: string
  key_results: KeyResult[]
  status: OKRStatus
  quarter: string
  created_at: string
}

export interface KeyResult {
  id: string
  okr_id: string
  description: string
  target: number
  current: number
  unit: string
  created_at: string
}

export interface StrategicProject {
  id: string
  title: string
  description: string | null
  status: 'planning' | 'active' | 'paused' | 'completed'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
}

export interface StrategicNote {
  id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalRevenue: number
  mrr: number
  totalCosts: number
  profit: number
  activeClients: number
  churnedClients: number
  pendingTasks: number
  revenueAtRisk: number
}

export interface RevenueChartData {
  month: string
  revenue: number
  costs: number
  profit: number
}

// ─── Growth Simulator ─────────────────────────────────────────────────────────

export interface GrowthSimulatorInputs {
  currentMRR: number
  growthRate: number
  churnRate: number
  months: number
  avgCostPercentage: number
}

export interface GrowthProjection {
  month: string
  mrr: number
  costs: number
  profit: number
  clients: number
}

// ─── Organizations ────────────────────────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  created_at: string
}

export type OrgApiKeyProvider = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'deepseek' | 'other'

export interface OrgApiKey {
  id: string
  organization_id: string
  provider: OrgApiKeyProvider
  label: string | null
  key_hint: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Team / Profiles ──────────────────────────────────────────────────────────

export type UserRole = 'founder' | 'manager' | 'financial' | 'developer' | 'employee'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  organization_id: string | null
  created_at: string
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Project {
  id: string
  title: string
  description: string | null
  objectives: string | null
  scope: string | null
  deliverables: string | null
  risks: string | null
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string | null
  end_date: string | null
  owner_id: string | null
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  created_at: string
}

export interface ProjectTask {
  id: string
  project_id: string
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  position: number
  completed: boolean
  created_at: string
  project_subtasks?: ProjectSubtask[]
}

export interface ProjectSubtask {
  id: string
  task_id: string
  title: string
  assigned_to: string | null
  due_date: string | null
  completed: boolean
  created_at: string
}

export interface ProjectWithDetails extends Project {
  project_members: ProjectMember[]
  project_tasks: ProjectTask[]
}

export interface ProjectListItem extends Project {
  project_tasks: Array<{
    id: string
    completed: boolean
    project_subtasks: Array<{ id: string; completed: boolean }>
  }>
  project_members: Array<{ user_id: string }>
}

export type ProjectFormData = Omit<Project, 'id' | 'created_at'>
export type ProjectTaskFormData = Omit<ProjectTask, 'id' | 'created_at' | 'project_subtasks'>
export type ProjectSubtaskFormData = Omit<ProjectSubtask, 'id' | 'created_at'>

// ─── Marketing ────────────────────────────────────────────────────────────────

export type MarketingChannel = 'paid_search' | 'paid_social' | 'seo' | 'content' | 'email' | 'referral' | 'other'
export type MarketingCampaignStatus = 'planning' | 'active' | 'paused' | 'completed'

export interface MarketingCampaign {
  id: string
  organization_id: string
  name: string
  channel: MarketingChannel
  status: MarketingCampaignStatus
  start_date: string | null
  end_date: string | null
  investment: number
  traffic: number
  leads_generated: number
  conversions: number
  revenue_generated: number
  notes: string | null
  created_at: string
}

export type MarketingCampaignFormData = Omit<MarketingCampaign, 'id' | 'organization_id' | 'created_at'>

export interface MarketingSummary {
  totalInvestment: number
  totalTraffic: number
  totalLeads: number
  totalConversions: number
  totalRevenue: number
  cac: number
  roi: number
  conversionRate: number
  byChannel: { channel: MarketingChannel; investment: number; revenue: number }[]
}

// ─── Communication ────────────────────────────────────────────────────────────

export interface CommunicationChannel {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export type CommunicationChannelFormData = Pick<CommunicationChannel, 'name' | 'description'>

export interface CommunicationMessage {
  id: string
  channel_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: Pick<Profile, 'full_name'>
}

// ─── Client API Keys ──────────────────────────────────────────────────────────

export type ApiKeyProvider = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'deepseek' | 'other'

export interface ClientApiKey {
  id: string
  client_id: string
  provider: ApiKeyProvider
  label: string | null
  key_hint: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClientApiKeyFormData {
  client_id: string
  provider: ApiKeyProvider
  label: string | null
  api_key: string
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
