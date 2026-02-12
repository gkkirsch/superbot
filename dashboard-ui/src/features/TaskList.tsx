import { useState } from 'react'
import { Circle, Loader2, CheckCircle2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { PriorityBadge } from '@/features/TaskBadge'
import { useSpaceTasks } from '@/hooks/useSpaces'
import type { Task } from '@/lib/types'

type FilterStatus = 'all' | Task['status']

const priorityRank: Record<Task['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const statusIcon: Record<Task['status'], React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-stone" />,
  in_progress: <Loader2 className="h-4 w-4 text-sand animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-moss" />,
}

const filters: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
]

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const prioA = priorityRank[a.priority]
    const prioB = priorityRank[b.priority]
    if (prioA !== prioB) return prioA - prioB
    return a.id - b.id
  })
}

function TaskRow({ task }: { task: Task }) {
  const [open, setOpen] = useState(false)
  const isBlocked = task.blockedBy.length > 0

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-border-custom last:border-b-0">
        <CollapsibleTrigger className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface/50 transition-colors">
          <span className="shrink-0">{statusIcon[task.status]}</span>

          <span className="flex-1 min-w-0">
            <span className="text-sm text-parchment truncate block">
              {task.subject}
            </span>
          </span>

          {isBlocked && (
            <span className="flex items-center gap-1 text-xs text-ember/70">
              <AlertTriangle className="h-3 w-3" />
              Blocked
            </span>
          )}

          <PriorityBadge priority={task.priority} />

          {task.labels.map((label) => (
            <Badge key={label} variant="outline" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
              {label}
            </Badge>
          ))}

          {open
            ? <ChevronDown className="h-4 w-4 text-stone shrink-0" />
            : <ChevronRight className="h-4 w-4 text-stone shrink-0" />
          }
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pl-11 space-y-2">
            {task.description ? (
              <p className="text-sm text-stone whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-sm text-stone/40 italic">No description</p>
            )}

            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:hidden">
                {task.labels.map((label) => (
                  <Badge key={label} variant="outline" className="text-[10px] px-1.5 py-0">
                    {label}
                  </Badge>
                ))}
              </div>
            )}

            {isBlocked && (
              <p className="text-xs text-ember/70">
                Blocked by: {task.blockedBy.map((id) => `#${id}`).join(', ')}
              </p>
            )}

            {task.blocks.length > 0 && (
              <p className="text-xs text-stone/60">
                Blocks: {task.blocks.map((id) => `#${id}`).join(', ')}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function TaskList({ slug }: { slug: string }) {
  const { data: tasks, isLoading, error } = useSpaceTasks(slug)
  const [filter, setFilter] = useState<FilterStatus>('all')

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-stone/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-ember/30 bg-ember/5 px-4 py-3 text-sm text-ember">
        Failed to load tasks: {error.message}
      </div>
    )
  }

  const allTasks = tasks ?? []
  const filtered = filter === 'all' ? allTasks : allTasks.filter((t) => t.status === filter)
  const sorted = sortTasks(filtered)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-sand/20 text-sand'
                : 'bg-stone/10 text-stone hover:text-parchment'
            }`}
          >
            {f.label}
            {f.value === 'all'
              ? ` (${allTasks.length})`
              : ` (${allTasks.filter((t) => t.status === f.value).length})`
            }
          </button>
        ))}
      </div>

      {allTasks.length === 0 && (
        <div className="py-12 text-center text-stone">
          <p className="font-heading text-sm">No tasks yet</p>
        </div>
      )}

      {allTasks.length > 0 && sorted.length === 0 && (
        <div className="py-12 text-center text-stone">
          <p className="text-sm">No tasks matching "{filters.find((f) => f.value === filter)?.label}"</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="rounded-lg border border-border-custom overflow-hidden">
          {sorted.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
