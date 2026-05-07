'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState, useTransition } from 'react'
import { Menu, Sun, Moon, Globe } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { setLocale } from '@/actions/setLocale'

const PAGE_KEYS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/clients':   'clients',
  '/financial': 'financial',
  '/contador':  'contador',
  '/demands':   'demands',
  '/founder':   'founder',
  '/docs':      'docs',
  '/team':      'team',
  '/projects':  'projects',
  '/settings':  'settings',
}

const LANGS = ['pt', 'en', 'es', 'fr', 'de', 'zh'] as const

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname      = usePathname()
  const { theme, setTheme } = useTheme()
  const t             = useTranslations()
  const locale        = useLocale()
  const router        = useRouter()
  const [mounted, setMounted]   = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [, startTransition]     = useTransition()

  useEffect(() => { setMounted(true) }, [])

  const pageKey = Object.entries(PAGE_KEYS).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1]

  const title       = pageKey ? t(`header.pages.${pageKey}.title`)       : 'L Board'
  const description = pageKey ? t(`header.pages.${pageKey}.description`) : ''

  function handleLangChange(lang: string) {
    setLangOpen(false)
    startTransition(async () => {
      await setLocale(lang)
      router.refresh()
    })
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label={t('header.openMenu')}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>

      {/* Language switcher */}
      <div className="relative">
        <button
          onClick={() => setLangOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t('language.label')}
        >
          <Globe className="h-4 w-4" />
        </button>
        {langOpen && (
          <div className="absolute right-0 top-10 z-50 w-36 rounded-md border border-border bg-popover shadow-md">
            {LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLangChange(lang)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent ${
                  locale === lang ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span className="uppercase text-xs font-mono w-6">{lang}</span>
                {t(`language.${lang}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme toggle */}
      {mounted && (
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t('header.toggleTheme')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      )}
    </header>
  )
}
