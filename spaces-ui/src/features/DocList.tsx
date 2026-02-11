import { FileText, FolderOpen } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSpaceDocs } from '@/hooks/useSpaces'
import type { DocFile } from '@/lib/types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

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
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function groupByDirectory(docs: DocFile[]): { dir: string; files: DocFile[] }[] {
  const groups: Record<string, DocFile[]> = {}

  for (const doc of docs) {
    const parts = doc.relativePath.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : 'docs'
    if (!groups[dir]) groups[dir] = []
    groups[dir].push(doc)
  }

  const dirOrder = ['docs', 'plans', 'research', 'design']
  const entries = Object.entries(groups)
  entries.sort(([a], [b]) => {
    const aIdx = dirOrder.indexOf(a)
    const bIdx = dirOrder.indexOf(b)
    const aRank = aIdx >= 0 ? aIdx : 99
    const bRank = bIdx >= 0 ? bIdx : 99
    return aRank - bRank
  })

  return entries.map(([dir, files]) => ({ dir, files }))
}

interface DocListProps {
  slug: string
  selectedPath: string | null
  onSelect: (relativePath: string) => void
}

export function DocList({ slug, selectedPath, onSelect }: DocListProps) {
  const { data: docs, isLoading, error } = useSpaceDocs(slug)

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-stone/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-ember">
        Failed to load docs: {error.message}
      </div>
    )
  }

  const allDocs = docs ?? []

  if (allDocs.length === 0) {
    return (
      <div className="py-12 text-center text-stone">
        <p className="font-heading text-sm">No documentation yet</p>
      </div>
    )
  }

  const grouped = groupByDirectory(allDocs)

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-4">
        {grouped.map((group) => (
          <div key={group.dir}>
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-heading text-stone uppercase tracking-wider">
              <FolderOpen className="h-3.5 w-3.5" />
              {group.dir}
            </div>
            <div className="space-y-0.5">
              {group.files.map((doc) => {
                const isActive = selectedPath === doc.relativePath
                return (
                  <button
                    key={doc.relativePath}
                    onClick={() => onSelect(doc.relativePath)}
                    className={`w-full text-left px-2 py-2 rounded-md flex items-start gap-2.5 transition-colors ${
                      isActive
                        ? 'border-l-2 border-ember bg-surface/50'
                        : 'border-l-2 border-transparent hover:bg-surface/30'
                    }`}
                  >
                    <FileText className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-ember' : 'text-stone'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isActive ? 'text-parchment' : 'text-parchment/70'}`}>
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-stone/60">
                        {formatSize(doc.size)} · {timeAgo(doc.modified)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
