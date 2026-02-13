import { useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { Menu, X, MessageCircleQuestion } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { topNavItems } from '@/lib/navigation'
import { useDecisions } from '@/hooks/useSpaces'

function useHealthStatus() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error('Failed')
      return res.json() as Promise<{ overall: string }>
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

function HealthDot() {
  const { data } = useHealthStatus()

  if (!data) {
    return (
      <Link to="/health" className="relative flex items-center gap-1.5 text-xs text-stone/50 hover:text-stone transition-colors" title="Loading health...">
        <span className="h-2.5 w-2.5 rounded-full bg-stone/30 animate-pulse" />
      </Link>
    )
  }

  const isHealthy = data.overall === 'healthy'

  return (
    <Link
      to="/health"
      className={`relative flex items-center gap-1.5 text-xs transition-colors ${
        isHealthy ? 'text-moss hover:text-moss/80' : 'text-ember hover:text-ember/80'
      }`}
      title={isHealthy ? 'All systems operational' : 'System degraded — click for details'}
    >
      <span className="relative flex h-2.5 w-2.5">
        {!isHealthy && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-ember opacity-40 animate-ping" />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isHealthy ? 'bg-moss' : 'bg-ember'}`} />
      </span>
      <span className="hidden sm:inline">{isHealthy ? 'Healthy' : 'Degraded'}</span>
    </Link>
  )
}

function DecisionsBadge() {
  const { data: decisions } = useDecisions('pending')
  const count = decisions?.length ?? 0

  if (count === 0) return null

  return (
    <Link
      to="/#decisions"
      onClick={() => {
        // Scroll to decisions section on dashboard
        setTimeout(() => {
          document.querySelector('[data-section="decisions"]')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }}
      className="relative flex items-center gap-1.5 text-xs text-sand hover:text-sand/80 transition-colors"
      title={`${count} decision${count !== 1 ? 's' : ''} waiting`}
    >
      <span className="relative">
        <MessageCircleQuestion className="h-4 w-4" />
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sand text-[9px] font-bold text-ink px-0.5">
          {count}
        </span>
      </span>
      <span className="hidden sm:inline">{count} pending</span>
    </Link>
  )
}

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <nav className="border-b border-border-custom bg-ink sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 flex items-center h-14 gap-8">
        <NavLink to="/" className="font-heading text-lg text-parchment hover:text-sand transition-colors shrink-0">
          superbot
        </NavLink>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {topNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={() =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive(to, end)
                    ? 'bg-sand/15 text-sand font-medium'
                    : 'text-stone hover:text-parchment hover:bg-surface'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="flex-1" />

        {/* Decisions badge */}
        <DecisionsBadge />

        {/* Health indicator */}
        <HealthDot />

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-stone hover:text-parchment transition-colors"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border-custom bg-ink px-6 py-4 space-y-1">
          {topNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={() =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive(to, end)
                    ? 'bg-sand/15 text-sand font-medium'
                    : 'text-stone hover:text-parchment hover:bg-surface'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
