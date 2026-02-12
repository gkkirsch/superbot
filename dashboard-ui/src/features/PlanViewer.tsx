import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSpaceOverview } from '@/hooks/useSpaces'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="font-heading text-2xl text-parchment mt-8 mb-4 first:mt-0" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="font-heading text-xl text-parchment mt-6 mb-3" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="font-heading text-lg text-parchment mt-5 mb-2" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="font-heading text-base text-parchment mt-4 mb-2" {...props}>{children}</h4>
  ),
  p: ({ children, ...props }) => (
    <p className="text-sm text-parchment/80 mb-3 leading-relaxed" {...props}>{children}</p>
  ),
  a: ({ children, href, ...props }) => (
    <a href={href} className="text-sand hover:text-sand/80 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside text-sm text-parchment/80 mb-3 space-y-1 pl-2" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside text-sm text-parchment/80 mb-3 space-y-1 pl-2" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-sm text-parchment/80" {...props}>{children}</li>
  ),
  code: ({ children, className, ...props }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="font-mono text-xs bg-codebg rounded px-1.5 py-0.5 text-sand" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={`font-mono text-xs ${className ?? ''}`} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre className="bg-codebg rounded-lg p-4 mb-4 overflow-x-auto text-xs text-parchment/80" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border border-border-custom" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-surface" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="font-heading text-xs text-parchment px-3 py-2 text-left border-b border-border-custom" {...props}>
      {children}
    </th>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-border-custom even:bg-surface/50" {...props}>{children}</tr>
  ),
  td: ({ children, ...props }) => (
    <td className="px-3 py-2 text-sm text-parchment/80" {...props}>{children}</td>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-2 border-sand/40 pl-4 italic text-stone mb-3" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props) => (
    <hr className="border-border-custom my-6" {...props} />
  ),
  input: ({ checked, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className={`mr-2 h-3.5 w-3.5 rounded border appearance-none inline-block align-text-bottom ${
        checked
          ? 'bg-moss border-moss'
          : 'bg-transparent border-stone'
      }`}
      {...props}
    />
  ),
}

export function PlanViewer({ slug }: { slug: string }) {
  const { data, isLoading, error } = useSpaceOverview(slug)

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <div className="h-6 w-1/3 rounded bg-stone/10 animate-pulse" />
        <div className="h-4 w-full rounded bg-stone/10 animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-stone/10 animate-pulse" />
        <div className="h-4 w-3/5 rounded bg-stone/10 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-ember/30 bg-ember/5 px-4 py-3 text-sm text-ember">
        Failed to load plan: {error.message}
      </div>
    )
  }

  if (!data?.exists || !data.content) {
    return (
      <div className="py-12 text-center text-stone">
        <p className="font-heading text-sm">No overview yet</p>
        <p className="text-xs mt-1 text-stone/60">Create an OVERVIEW.md in the space directory to get started.</p>
      </div>
    )
  }

  return (
    <div className="py-4">
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {data.content}
      </Markdown>
    </div>
  )
}
