import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/requireAuth'
import { encrypt } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.lboard.com.br'

  const { user, error: authError } = await requireAuth()
  if (authError) return NextResponse.redirect(`${appUrl}/settings?google=error`)

  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${appUrl}/settings?google=error`)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${appUrl}/settings?google=error`)
  }

  const { encrypted_key, iv, auth_tag } = encrypt(tokens.refresh_token)

  const supabase = createAdminClient()
  await supabase.from('google_oauth_tokens').upsert(
    { user_id: user!.id, encrypted_token: encrypted_key, iv, auth_tag, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  return NextResponse.redirect(`${appUrl}/settings?google=success`)
}
