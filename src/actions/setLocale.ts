'use server'
import { cookies } from 'next/headers'
import { locales, type Locale } from '@/i18n/request'

export async function setLocale(locale: string) {
  if (!locales.includes(locale as Locale)) return
  ;(await cookies()).set('locale', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  })
}
