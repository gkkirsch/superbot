import { Link } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, XCircle, Circle, Loader2,
  ArrowRight, User, Brain, BookHeart, Clock, CalendarClock,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSpaces, useHeartbeat, useSchedule } from '@/hooks/useSpaces'
import { SpaceCard } from '@/features/SpaceCard'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import type { SpaceOverview } from '@/lib/types'

// --- Health (compact) ---

interface HealthCheck {
  name: string
  status: 'healthy' | 'stopped' | 'warning' | 'idle' | 'active' | 'unknown' | 'degraded'
  detail: string
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

const statusIcon: Record<string, React.ReactNode> = {
  healthy: <CheckCircle2 className="h-3.5 w-3.5 text-moss" />,
  active: <Loader2 className="h-3.5 w-3.5 text-sand animate-spin" />,
  idle: <Circle className="h-3.5 w-3.5 text-stone/50" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-sand" />,
  stopped: <XCircle className="h-3.5 w-3.5 text-ember" />,
  unknown: <Circle className="h-3.5 w-3.5 text-stone/30" />,
  degraded: <AlertTriangle className="h-3.5 w-3.5 text-ember" />,
}

function HealthStrip() {
  const { data } = useHealth()
  if (!data) return null

  const isHealthy = data.overall === 'healthy'

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center gap-4 flex-wrap ${
      isHealthy ? 'bg-moss/5 border-moss/20' : 'bg-ember/5 border-ember/20'
    }`}>
      <div className="flex items-center gap-2 shrink-0">
        {isHealthy
          ? <CheckCircle2 className="h-4 w-4 text-moss" />
          : <AlertTriangle className="h-4 w-4 text-ember" />
        }
        <span className={`text-sm font-heading ${isHealthy ? 'text-moss' : 'text-ember'}`}>
          {isHealthy ? 'All Systems Go' : 'Degraded'}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {data.checks.map((c) => (
          <span key={c.name} className="flex items-center gap-1.5 text-xs text-stone" title={c.detail}>
            {statusIcon[c.status] ?? statusIcon.unknown}
            {c.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// --- Quick links ---

function QuickLinks() {
  const links = [
    { to: '/system/context', label: 'Identity', icon: User, hash: 'identity' },
    { to: '/system/context', label: 'User', icon: BookHeart, hash: 'user' },
    { to: '/system/context', label: 'Memory', icon: Brain, hash: 'memory' },
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {links.map(({ to, label, icon: Icon }) => (
        <Link
          key={label}
          to={to}
          className="flex items-center gap-1.5 rounded-md border border-border-custom bg-surface px-3 py-1.5 text-sm text-stone hover:text-parchment hover:border-sand/30 transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Link>
      ))}
    </div>
  )
}

// --- Spaces section ---

function SpacesSection() {
  const { data: spaces, isLoading } = useSpaces()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-stone/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!spaces || spaces.length === 0) {
    return (
      <div className="rounded-lg border border-border-custom bg-surface/50 py-10 text-center">
        <p className="text-sm text-stone">No spaces yet.</p>
      </div>
    )
  }

  // Sort: active/in_progress first, then by most recently updated
  const sorted = [...spaces].sort((a: SpaceOverview, b: SpaceOverview) => {
    const activeStatuses = ['active', 'in_progress']
    const aActive = activeStatuses.includes(a.status) ? 0 : 1
    const bActive = activeStatuses.includes(b.status) ? 0 : 1
    if (aActive !== bActive) return aActive - bActive
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((space) => (
          <SpaceCard key={space.slug} space={space} />
        ))}
      </div>
      {spaces.length > 6 && (
        <div className="mt-4 text-center">
          <Link to="/spaces" className="text-sm text-sand hover:text-sand/80 transition-colors">
            View all {spaces.length} spaces <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

// --- Heartbeat section ---

function HeartbeatSection() {
  const { data, isLoading } = useHeartbeat()

  if (isLoading) {
    return <div className="h-40 rounded-lg bg-stone/5 animate-pulse" />
  }

  if (!data || !data.content) {
    return (
      <div className="rounded-lg border border-border-custom bg-surface/50 py-8 text-center">
        <p className="text-sm text-stone">No heartbeat data.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-custom bg-surface/30 p-5 overflow-auto max-h-[500px]">
      <MarkdownRenderer content={data.content} />
    </div>
  )
}

// --- Schedule section ---

interface ScheduleJob {
  name: string
  time: string
  days?: string[]
  task: string
}

interface ScheduleResponse {
  schedule: ScheduleJob[]
  lastRun: string | null
}

function ScheduleSection() {
  const { data, isLoading } = useSchedule() as { data: ScheduleResponse | undefined; isLoading: boolean }

  if (isLoading) {
    return <div className="h-32 rounded-lg bg-stone/5 animate-pulse" />
  }

  if (!data || data.schedule.length === 0) {
    return (
      <div className="rounded-lg border border-border-custom bg-surface/50 py-8 text-center">
        <p className="text-sm text-stone">No scheduled jobs.</p>
        <Link to="/system/schedule" className="text-xs text-sand hover:text-sand/80 transition-colors mt-1 inline-block">
          Configure schedule <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-custom overflow-hidden">
      <div className="divide-y divide-border-custom">
        {data.schedule.map((job) => (
          <div key={job.name} className="flex items-start gap-3 px-4 py-3 hover:bg-surface/50 transition-colors">
            <CalendarClock className="h-4 w-4 text-sand shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-heading text-parchment">{job.name}</span>
                <span className="text-[10px] font-mono text-stone bg-stone/10 rounded px-1.5 py-0.5">
                  {job.time}
                </span>
                {job.days && (
                  <span className="text-[10px] text-stone/60">
                    {job.days.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone/70 mt-0.5 truncate">{job.task}</p>
            </div>
          </div>
        ))}
      </div>
      {data.lastRun && (
        <div className="px-4 py-2 bg-surface/30 border-t border-border-custom">
          <span className="text-[10px] text-stone/50">
            Last run: {new Date(data.lastRun).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}

// --- Section header ---

function SectionHeader({ title, icon: Icon, linkTo, linkLabel }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  linkTo?: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-sand" />
        <h2 className="font-heading text-xl text-parchment">{title}</h2>
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-stone hover:text-sand transition-colors flex items-center gap-1">
          {linkLabel ?? 'View all'} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}

// --- Main Dashboard ---

export function Dashboard() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="font-heading text-4xl text-parchment">superbot</h1>
          <QuickLinks />
        </div>

        {/* Health strip */}
        <div className="mb-10">
          <HealthStrip />
        </div>

        {/* Spaces */}
        <section className="mb-12">
          <SectionHeader
            title="Spaces"
            icon={({ className }) => (
              <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" />
              </svg>
            )}
            linkTo="/spaces"
            linkLabel="All spaces"
          />
          <SpacesSection />
        </section>

        {/* Heartbeat + Schedule side by side on desktop */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_340px]">
          <section>
            <SectionHeader
              title="Heartbeat"
              icon={Clock}
              linkTo="/system/context"
              linkLabel="Edit"
            />
            <HeartbeatSection />
          </section>

          <section>
            <SectionHeader
              title="Schedule"
              icon={CalendarClock}
              linkTo="/system/schedule"
              linkLabel="Manage"
            />
            <ScheduleSection />
          </section>
        </div>
      </div>
    </div>
  )
}
