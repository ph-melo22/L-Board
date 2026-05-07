import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { CookieMethodsServer } from '@supabase/ssr'

// Access control per role
const ROLE_ALLOWED: Record<string, string[]> = {
  founder:   ['/dashboard', '/clients', '/financial', '/contador', '/demands', '/founder', '/docs', '/team', '/projects', '/settings'],
  manager:   ['/dashboard', '/clients', '/demands', '/projects'],
  financial: ['/dashboard', '/financial', '/contador', '/clients'],
  developer: ['/dashboard', '/demands', '/docs', '/projects'],
  employee:  ['/dashboard', '/demands', '/projects'],
}

const AUTH_UTILITY_PATHS = ['/auth/reset-password', '/auth/callback', '/auth/forgot-password']
const AUTH_PUBLIC_PATHS  = ['/auth/register']

function buildCSP(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://vercel.live",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  // Generate a unique nonce per request for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp   = buildCSP(nonce)

  // Forward nonce to server components via request header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
  supabaseResponse.headers.set('Content-Security-Policy', csp)

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
      supabaseResponse.headers.set('Content-Security-Policy', csp)
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options)
      )
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthUtility = AUTH_UTILITY_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPublic  = AUTH_PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (pathname === '/') {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    supabaseResponse.headers.set('Content-Security-Policy', csp)
    return supabaseResponse
  }

  if (isAuthPublic) {
    supabaseResponse.headers.set('Content-Security-Policy', csp)
    return supabaseResponse
  }

  if (!user && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && pathname.startsWith('/auth') && !isAuthUtility) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && !pathname.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'employee'
    if (role !== 'founder') {
      const allowed   = ROLE_ALLOWED[role] ?? ROLE_ALLOWED['employee']
      const isAllowed = allowed.some((p) => pathname.startsWith(p))
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/demands', request.url))
      }
    }
  }

  supabaseResponse.headers.set('Content-Security-Policy', csp)
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
