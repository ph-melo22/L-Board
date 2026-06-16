import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto'

async function getAccessToken(userId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('google_oauth_tokens')
    .select('encrypted_token, iv, auth_tag')
    .eq('user_id', userId)
    .single()

  if (!data) throw new Error('Google Calendar não conectado')

  const refreshToken = decrypt(data.encrypted_token, data.iv, data.auth_tag)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  const tokens = await res.json()
  if (!tokens.access_token) throw new Error('Falha ao renovar token do Google')
  return tokens.access_token
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: string[]
}

export async function listEvents(userId: string, daysAhead = 7): Promise<CalendarEvent[]> {
  const accessToken = await getAccessToken(userId)

  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '20',
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const data = await res.json()
  return (data.items ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    title: (e.summary as string) ?? '(sem título)',
    start: ((e.start as Record<string, string>)?.dateTime ?? (e.start as Record<string, string>)?.date) as string,
    end: ((e.end as Record<string, string>)?.dateTime ?? (e.end as Record<string, string>)?.date) as string,
    description: e.description as string | undefined,
    location: e.location as string | undefined,
    attendees: ((e.attendees as { email: string }[]) ?? []).map((a) => a.email),
  }))
}

export async function createEvent(
  userId: string,
  event: { title: string; description?: string; start: string; end: string; attendees?: string[] }
): Promise<CalendarEvent> {
  const accessToken = await getAccessToken(userId)

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: event.start, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: event.end, timeZone: 'America/Sao_Paulo' },
      attendees: event.attendees?.map((email) => ({ email })),
    }),
  })

  const data = await res.json()
  return {
    id: data.id,
    title: data.summary ?? '(sem título)',
    start: data.start?.dateTime ?? data.start?.date,
    end: data.end?.dateTime ?? data.end?.date,
  }
}

export async function isConnected(userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('google_oauth_tokens')
    .select('id')
    .eq('user_id', userId)
    .single()
  return !!data
}
