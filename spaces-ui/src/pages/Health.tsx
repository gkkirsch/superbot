import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, Circle, Loader2, XCircle, Activity } from 'lucide-react'

interface HealthCheck {
  name: string
  description: string
  status: 'healthy' | 'stopped' | 'warning' | 'idle' | 'active' | 'unknown' | 'degraded'
  detail: string
  sessions?: { name: string; space: string | null }[]
}

interface HealthResponse {
  overall: 'healthy' | 'degraded'
  checks: HealthCheck[]
  timestamp: string
}

function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error('Failed to fetch health')
      return res.json()
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  healthy: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'text-moss',
    bg: 'bg-moss/10 border-moss/20',
  },
  active: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    color: 'text-sand',
    bg: 'bg-sand/10 border-sand/20',
  },
  idle: {
    icon: <Circle className="h-5 w-5" />,
    color: 'text-stone',
    bg: 'bg-stone/10 border-stone/20',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'text-sand',
    bg: 'bg-sand/10 border-sand/20',
  },
  stopped: {
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-ember',
    bg: 'bg-ember/10 border-ember/20',
  },
  unknown: {
    icon: <Circle className="h-5 w-5" />,
    color: 'text-stone/50',
    bg: 'bg-stone/5 border-stone/10',
  },
  degraded: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: 'text-ember',
    bg: 'bg-ember/10 border-ember/20',
  },
}

function HealthCard({ check }: { check: HealthCheck }) {
  const config = statusConfig[check.status] ?? statusConfig.unknown

  return (
    <div className={`rounded-lg border p-4 transition-colors ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-heading text-parchment">{check.name}</h3>
            <span className={`text-[10px] font-medium uppercase tracking-wider ${config.color}`}>
              {check.status}
            </span>
          </div>
          <p className="text-xs text-stone mb-1">{check.description}</p>
          <p className="text-xs text-stone/70 font-mono">{check.detail}</p>
          {check.sessions && check.sessions.length > 0 && (
            <div className="mt-2 space-y-1">
              {check.sessions.map((s) => (
                <div key={s.name} className="text-[10px] text-stone/60 font-mono">
                  {s.name}{s.space ? ` [${s.space}]` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Health() {
  const { data, isLoading, error } = useHealth()

  const isHealthy = data?.overall === 'healthy'
  const time = data ? new Date(data.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-6 w-6 text-sand" />
            <h1 className="font-heading text-4xl text-parchment">System Health</h1>
          </div>
          <p className="text-stone">Service status and diagnostics.</p>
        </header>

        {error && (
          <div className="rounded-lg border border-ember/30 bg-ember/5 px-6 py-4 text-ember mb-6">
            Failed to load health status: {error.message}
          </div>
        )}

        {isLoading && (
          <>
            <div className="h-24 rounded-lg bg-stone/5 animate-pulse mb-8" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-stone/5 animate-pulse" />
              ))}
            </div>
          </>
        )}

        {data && (
          <>
            <div className={`rounded-lg border p-6 mb-8 ${isHealthy ? 'bg-moss/5 border-moss/20' : 'bg-ember/5 border-ember/20'}`}>
              <div className="flex items-center gap-4">
                <div className={isHealthy ? 'text-moss' : 'text-ember'}>
                  {isHealthy
                    ? <CheckCircle2 className="h-8 w-8" />
                    : <AlertTriangle className="h-8 w-8" />
                  }
                </div>
                <div>
                  <h2 className="font-heading text-xl text-parchment">
                    {isHealthy ? 'All Systems Operational' : 'System Degraded'}
                  </h2>
                  <p className="text-xs text-stone mt-1">Last checked at {time}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.checks.map((check) => (
                <HealthCard key={check.name} check={check} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
