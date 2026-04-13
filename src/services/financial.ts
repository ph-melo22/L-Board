import { createClient } from '@/lib/supabase/client'
import type {
  FinancialEntry,
  FinancialEntryFormData,
  FinancialExpense,
  FinancialExpenseFormData,
} from '@/types'

// ─── Entries ──────────────────────────────────────────────────────────────────

export async function getFinancialEntries(): Promise<FinancialEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_entries')
    .select('*, clients(id, name)')
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createFinancialEntry(formData: FinancialEntryFormData): Promise<FinancialEntry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_entries')
    .insert(formData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateFinancialEntry(
  id: string,
  formData: Partial<FinancialEntryFormData>
): Promise<FinancialEntry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_entries')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteFinancialEntry(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('financial_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getFinancialExpenses(): Promise<FinancialExpense[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_expenses')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createFinancialExpense(formData: FinancialExpenseFormData): Promise<FinancialExpense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_expenses')
    .insert(formData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateFinancialExpense(
  id: string,
  formData: Partial<FinancialExpenseFormData>
): Promise<FinancialExpense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_expenses')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteFinancialExpense(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('financial_expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Summary calculations ─────────────────────────────────────────────────────

export function calcEntriesTotal(entries: FinancialEntry[]): number {
  return entries
    .filter((e) => e.status !== 'cancelled')
    .reduce((acc, e) => acc + e.value, 0)
}

export function calcExpensesTotal(expenses: FinancialExpense[]): number {
  return expenses.reduce((acc, e) => acc + e.value, 0)
}
