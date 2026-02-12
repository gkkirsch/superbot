import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSchedule } from '@/hooks/useSpaces'

interface ScheduleJob {
  name: string
  time: string
  days?: string[]
  task: string
}

export function Schedule() {
  const { data, isLoading, error } = useSchedule()

  const jobs: ScheduleJob[] = (data as { schedule?: ScheduleJob[] })?.schedule ?? []

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Schedule</h1>
      <p className="text-sm text-stone mb-6">Scheduled jobs that run at specific times.</p>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-stone/5 animate-pulse" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-ember">Error: {error.message}</p>}

      {!isLoading && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.name} className="rounded-lg border border-border-custom p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-4 w-4 text-sand" />
                <h3 className="text-sm font-heading text-parchment">{job.name}</h3>
                <Badge variant="outline" className="text-[10px]">{job.time}</Badge>
                {job.days && (
                  <span className="text-[10px] text-stone">
                    {job.days.join(', ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone pl-7">{job.task}</p>
            </div>
          ))}
          {jobs.length === 0 && (
            <p className="text-sm text-stone text-center py-12">No scheduled jobs.</p>
          )}
        </div>
      )}
    </div>
  )
}
