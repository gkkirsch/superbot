import { Loader2, Circle, CheckCircle2, Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSessions } from '@/hooks/useSpaces'

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const statusIcon: Record<string, React.ReactNode> = {
  active: <Loader2 className="h-3.5 w-3.5 text-sand animate-spin" />,
  inactive: <Circle className="h-3.5 w-3.5 text-stone" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-moss" />,
}

export function Sessions() {
  const { data, isLoading, error } = useSessions()

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Sessions</h1>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded bg-stone/5 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-ember/30 bg-ember/5 px-4 py-3 text-sm text-ember">
          Failed to load sessions: {error.message}
        </div>
      )}

      {data && (
        <div className="rounded-lg border border-border-custom overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-custom">
                <th className="text-left px-4 py-3 text-xs font-heading text-stone uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-stone uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-stone uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-stone uppercase tracking-wider hidden sm:table-cell">Space</th>
                <th className="text-left px-4 py-3 text-xs font-heading text-stone uppercase tracking-wider hidden md:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {data.map((session) => (
                <tr key={session.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-4 py-3 text-parchment font-mono text-xs">{session.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px]">{session.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      {statusIcon[session.status] ?? <Circle className="h-3.5 w-3.5 text-stone" />}
                      <span className="text-stone text-xs">{session.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {session.space ? (
                      <span className="flex items-center gap-1 text-sand text-xs">
                        <Hash className="h-3 w-3" />
                        {session.space}
                      </span>
                    ) : (
                      <span className="text-stone/40 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone text-xs hidden md:table-cell">
                    {timeAgo(session.createdAt)}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-stone">No sessions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
