import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FolderOpen } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StatusBadge, PriorityBadge } from '@/features/TaskBadge'
import { TaskList } from '@/features/TaskList'
import { PlanViewer } from '@/features/PlanViewer'
import { DocList } from '@/features/DocList'
import { DocViewer } from '@/features/DocViewer'
import { useSpace } from '@/hooks/useSpaces'
import type { Task } from '@/lib/types'

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="h-4 w-24 rounded bg-stone/10 animate-pulse mb-6" />
        <div className="h-8 w-2/3 rounded bg-stone/10 animate-pulse mb-3" />
        <div className="h-4 w-1/2 rounded bg-stone/10 animate-pulse mb-6" />
        <div className="flex gap-2 mb-8">
          <div className="h-6 w-20 rounded-full bg-stone/10 animate-pulse" />
          <div className="h-6 w-24 rounded-full bg-stone/10 animate-pulse" />
        </div>
        <div className="h-10 w-64 rounded bg-stone/10 animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-stone/5 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SpaceDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading, error } = useSpace(slug ?? '')
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-ink">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-sand transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Spaces
          </Link>
          <div className="py-20 text-center">
            <h2 className="font-heading text-xl text-parchment mb-2">Space not found</h2>
            <p className="text-sm text-stone">
              {error ? error.message : `No space found with slug "${slug}".`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const space = data.space

  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-sand transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Spaces
        </Link>

        <header className="mb-8">
          <h1 className="font-heading text-3xl text-parchment mb-2">
            {space.name}
          </h1>
          {space.description && (
            <p className="text-stone mb-4 max-w-2xl">{space.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <StatusBadge status={space.status as Task['status']} />
            <PriorityBadge priority={space.priority as Task['priority']} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {space.codeDir && (
              <span className="flex items-center gap-1.5 text-stone">
                <FolderOpen className="h-4 w-4" />
                <span className="font-mono text-xs">{space.codeDir}</span>
              </span>
            )}
            {space.urls.repo && (
              <a
                href={space.urls.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sand hover:text-sand/80 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Repo
              </a>
            )}
            {space.urls.production && (
              <a
                href={space.urls.production}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sand hover:text-sand/80 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Production
              </a>
            )}
          </div>
        </header>

        <Tabs defaultValue="tasks">
          <TabsList className="mb-6">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <TaskList slug={slug ?? ''} />
          </TabsContent>

          <TabsContent value="overview">
            <PlanViewer slug={slug ?? ''} />
          </TabsContent>

          <TabsContent value="docs">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
              <div className="rounded-lg border border-border-custom overflow-hidden">
                <DocList
                  slug={slug ?? ''}
                  selectedPath={selectedDoc}
                  onSelect={setSelectedDoc}
                />
              </div>
              <div className="rounded-lg border border-border-custom overflow-hidden min-h-[400px]">
                <DocViewer slug={slug ?? ''} docPath={selectedDoc} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
