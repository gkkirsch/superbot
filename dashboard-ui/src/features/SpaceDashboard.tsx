import { useState, useEffect, Component, type ReactNode } from 'react'
import type { SpaceOverview, Task } from '@/lib/types'

interface Props {
  slug: string
  space: SpaceOverview
  tasks: Task[]
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class DashboardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export function SpaceDashboard({ slug, space, tasks }: Props) {
  const [DashComponent, setDashComponent] = useState<React.ComponentType<{ space: SpaceOverview; tasks: Task[] }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        const url = `/api/spaces/${slug}/dashboard`
        const resp = await fetch(url)
        if (!resp.ok) {
          throw new Error(`Failed to load dashboard: ${resp.status}`)
        }
        const code = await resp.text()
        const blob = new Blob([code], { type: 'application/javascript' })
        const blobUrl = URL.createObjectURL(blob)
        const mod = await import(/* @vite-ignore */ blobUrl)
        URL.revokeObjectURL(blobUrl)

        if (!cancelled) {
          setDashComponent(() => mod.default)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
          setLoading(false)
        }
      }
    }

    loadDashboard()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-stone">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-ember/30 bg-ember/5 p-6">
        <h3 className="font-heading text-sm text-ember mb-2">Dashboard Error</h3>
        <p className="text-sm text-stone">{error}</p>
      </div>
    )
  }

  if (!DashComponent) return null

  return (
    <DashboardErrorBoundary
      fallback={
        <div className="rounded-lg border border-ember/30 bg-ember/5 p-6">
          <h3 className="font-heading text-sm text-ember mb-2">Dashboard Render Error</h3>
          <p className="text-sm text-stone">The dashboard component threw an error while rendering.</p>
        </div>
      }
    >
      <DashComponent space={space} tasks={tasks} />
    </DashboardErrorBoundary>
  )
}
