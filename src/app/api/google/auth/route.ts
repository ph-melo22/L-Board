import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'

export async function GET() {
  const { profile, error: authError } = await requireAuth()
  if (authError) return authError

  if (profile.role !== 'founder') {
    return NextResponse.json({ error: 'Apenas founders podem conectar o Google Calendar' }, { status: 403 })
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
