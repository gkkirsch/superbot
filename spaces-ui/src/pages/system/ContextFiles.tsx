import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { useIdentity, useUser, useMemory, useHeartbeat, useOnboard } from '@/hooks/useSpaces'
import type { MarkdownFile } from '@/lib/api'
import type { UseQueryResult } from '@tanstack/react-query'

function ContentPane({ query }: { query: UseQueryResult<MarkdownFile> }) {
  if (query.isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-stone/5 animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
        ))}
      </div>
    )
  }

  if (query.error || !query.data?.exists) {
    return <p className="text-sm text-stone/60 py-4">File not found or empty.</p>
  }

  return <MarkdownRenderer content={query.data.content} />
}

export function ContextFiles() {
  const identity = useIdentity()
  const user = useUser()
  const memory = useMemory()
  const heartbeat = useHeartbeat()
  const onboard = useOnboard()

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Context Files</h1>
      <p className="text-sm text-stone mb-6">
        Core files that define Boris's identity, user knowledge, and persistent memory.
      </p>

      <Tabs defaultValue="identity">
        <TabsList className="mb-6">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="heartbeat">Heartbeat</TabsTrigger>
          <TabsTrigger value="onboard">Onboard</TabsTrigger>
        </TabsList>

        <div className="rounded-lg border border-border-custom p-6 overflow-auto max-h-[calc(100vh-18rem)]">
          <TabsContent value="identity"><ContentPane query={identity} /></TabsContent>
          <TabsContent value="user"><ContentPane query={user} /></TabsContent>
          <TabsContent value="memory"><ContentPane query={memory} /></TabsContent>
          <TabsContent value="heartbeat"><ContentPane query={heartbeat} /></TabsContent>
          <TabsContent value="onboard"><ContentPane query={onboard} /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
