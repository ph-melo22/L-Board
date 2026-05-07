'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function RegisterPage() {
  const router = useRouter()
  const t      = useTranslations('auth.register')
  const [form, setForm]           = useState({ full_name: '', email: '', password: '', company_name: '' })
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const strength =
    form.password.length === 0 ? null :
    form.password.length < 8   ? t('strengthWeak')   :
    form.password.length < 12  ? t('strengthMedium') : t('strengthStrong')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? t('connectionError'))
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (signInError) {
        router.push('/auth/login')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError(t('connectionError'))
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">L</span>
          </div>
          <CardTitle className="text-xl">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t('fullName')}</Label>
              <Input
                id="full_name"
                placeholder={t('fullNamePlaceholder')}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">{t('companyName')}</Label>
              <Input
                id="company_name"
                placeholder={t('companyNamePlaceholder')}
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {strength && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {(['strengthWeak', 'strengthMedium', 'strengthStrong'] as const).map((s, i) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          strength === t('strengthWeak')   && i === 0 ? 'bg-destructive' :
                          strength === t('strengthMedium') && i <= 1  ? 'bg-yellow-400' :
                          strength === t('strengthStrong')             ? 'bg-emerald-500' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    strength === t('strengthWeak')   ? 'text-destructive' :
                    strength === t('strengthMedium') ? 'text-yellow-500'  : 'text-emerald-600'
                  }`}>
                    {strength}
                  </span>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('submitting') : t('submit')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/auth/login" className="text-foreground underline-offset-4 hover:underline">
              {t('login')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
