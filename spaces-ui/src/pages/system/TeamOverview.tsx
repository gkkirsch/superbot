import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTeam, useInbox, useGlobalTasks } from '@/hooks/useSpaces'

function JsonViewer({ data, isLoading, error }: { data: unknown; isLoading: boolean; error: Error | null }) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-stone/5 animate-pulse" style={{ width: `${40 + Math.random() * 60}%` }} />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-ember py-4">Error: {error.message}</p>
  }

  return (
    <pre className="bg-codebg rounded-md p-4 overflow-auto text-xs font-mono text-parchment max-h-[calc(100vh-20rem)]">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export function TeamOverview() {
  const team = useTeam()
  const inbox = useInbox()
  const tasks = useGlobalTasks()

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Team</h1>
      <p className="text-sm text-stone mb-6">
        Team configuration, inbox messages, and global task queue.
      </p>

      <Tabs defaultValue="config">
        <TabsList className="mb-6">
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <div className="rounded-lg border border-border-custom p-6">
          <TabsContent value="config"><JsonViewer {...team} /></TabsContent>
          <TabsContent value="inbox"><JsonViewer {...inbox} /></TabsContent>
          <TabsContent value="tasks"><JsonViewer {...tasks} /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
