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

// Auth pages that stay accessible even when authenticated
// (used for invite acceptance and password recovery flows)
const AUTH_UTILITY_PATHS = ['/auth/reset-password', '/auth/callback', '/auth/forgot-password']

// Public auth pages (registration — never redirect away even if logged in)
const AUTH_PUBLIC_PATHS = ['/auth/register']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      supabaseResponse = NextResponse.next({ request })
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
  const isAuthPublic = AUTH_PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Landing page is public
  if (pathname === '/') {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return supabaseResponse
  }

  // /auth/register is always accessible (unauthenticated users sign up here)
  if (isAuthPublic) return supabaseResponse

  // Unauthenticated → login (except auth pages)
  if (!user && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Authenticated + login page → dashboard
  // (but allow reset-password, callback, and forgot-password so invite/recovery flows work)
  if (user && pathname.startsWith('/auth') && !isAuthUtility) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based access for authenticated users on dashboard routes
  if (user && !pathname.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Restrict access based on role
    const role = profile?.role ?? 'employee'
    if (role !== 'founder') {
      const allowed = ROLE_ALLOWED[role] ?? ROLE_ALLOWED['employee']
      const isAllowed = allowed.some((p) => pathname.startsWith(p))
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/demands', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
