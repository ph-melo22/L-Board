import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['pt', 'en', 'es', 'fr', 'de', 'zh'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'pt'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('locale')?.value as Locale | undefined
  const locale: Locale = cookie && locales.includes(cookie) ? cookie : defaultLocale

  let messages
  try {
    messages = (await import(`../../messages/${locale}.json`)).default
  } catch {
    messages = (await import('../../messages/pt.json')).default
  }

  return {
    locale,
    messages,
  }
})
