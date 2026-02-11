import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, PriorityBadge } from '@/features/TaskBadge'
import { StatsBar } from '@/features/StatsBar'
import type { SpaceOverview, Task } from '@/lib/types'

function timeAgo(dateString: string | null): string {
  if (!dateString) return 'never'
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

interface SpaceCardProps {
  space: SpaceOverview
  style?: React.CSSProperties
}

export function SpaceCard({ space, style }: SpaceCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer border-border-custom transition-all duration-200 hover:border-sand/40 hover:-translate-y-0.5"
      onClick={() => navigate(`/${space.slug}`)}
      style={style}
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg text-parchment">
          {space.name}
        </CardTitle>
        {space.description && (
          <CardDescription className="line-clamp-2 text-stone">
            {space.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={space.priority as Task['priority']} />
          <StatusBadge status={space.status as Task['status']} />
        </div>

        {(space.tags.length > 0 || space.techStack.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {space.tags.map((tag) => (
              <Badge key={`tag-${tag}`} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {space.techStack.map((tech) => (
              <Badge key={`tech-${tech}`} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tech}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <StatsBar
          pending={space.taskCounts.pending}
          inProgress={space.taskCounts.in_progress}
          completed={space.taskCounts.completed}
        />
        <span className="text-xs text-stone/60">
          {timeAgo(space.lastUpdated)}
        </span>
      </CardFooter>
    </Card>
  )
}
