import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const { id, role } = await request.json()
    if (!id || !role) {
      return NextResponse.json({ error: 'id e role são obrigatórios' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
