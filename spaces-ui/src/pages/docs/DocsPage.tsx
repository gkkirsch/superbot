import { useParams } from 'react-router-dom'
import { useDocsPage } from '@/hooks/useSpaces'

export function DocsPage({ slug: defaultSlug }: { slug?: string }) {
  const params = useParams<{ slug: string }>()
  const slug = params.slug ?? defaultSlug ?? 'getting-started'
  const { data, isLoading, error } = useDocsPage(slug)

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <div className="h-8 w-2/3 rounded bg-stone/10 animate-pulse" />
        <div className="h-4 w-full rounded bg-stone/5 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-stone/5 animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-stone/5 animate-pulse" />
        <div className="h-4 w-full rounded bg-stone/5 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-stone/5 animate-pulse" />
      </div>
    )
  }

  if (error || !data?.exists) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-stone">
          {error ? `Error loading page: ${error.message}` : `Page "${slug}" not found.`}
        </p>
      </div>
    )
  }

  return (
    <div
      className="docs-content"
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  )
}
