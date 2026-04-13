'use client'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'Visão geral do negócio' },
  '/clients': { title: 'Clientes', description: 'Gestão da base de clientes' },
  '/financial': { title: 'Financeiro', description: 'Receitas, despesas e fluxo de caixa' },
  '/demands': { title: 'Demandas', description: 'Tarefas e entregas do time' },
  '/founder': { title: 'Founder Board', description: 'OKRs, projetos e notas estratégicas' },
  '/docs': { title: 'Documentação', description: 'Relatório técnico v0.1 beta' },
}

export function Header() {
  const pathname = usePathname()

  const match = Object.entries(pageTitles).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )

  const { title, description } = match?.[1] ?? { title: 'L Board', description: '' }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-6">
      <div className="flex-1">
        <h1 className="text-sm font-semibold">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </header>
  )
}
