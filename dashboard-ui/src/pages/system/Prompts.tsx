import { useState } from 'react'
import { FileText, ChevronRight, Copy, Check } from 'lucide-react'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { usePrompts, usePromptContent } from '@/hooks/useSpaces'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-stone hover:text-parchment hover:bg-surface transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-moss" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function Prompts() {
  const { data: prompts, isLoading } = usePrompts()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activeId = selectedId ?? prompts?.[0]?.id ?? null
  const { data: promptData } = usePromptContent(activeId ?? '')

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Prompts</h1>
      <p className="text-sm text-stone mb-6">System prompts that power superbot's agents and workers.</p>

      {isLoading && <div className="h-64 rounded bg-stone/5 animate-pulse" />}

      {prompts && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          <div className="rounded-lg border border-border-custom overflow-hidden divide-y divide-border-custom">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedId(prompt.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  activeId === prompt.id
                    ? 'bg-sand/10 border-l-2 border-sand'
                    : 'hover:bg-surface/50 border-l-2 border-transparent'
                }`}
              >
                <FileText className={`h-4 w-4 shrink-0 ${activeId === prompt.id ? 'text-sand' : 'text-stone'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${activeId === prompt.id ? 'text-parchment font-medium' : 'text-parchment'}`}>
                    {prompt.name}
                  </p>
                  <p className="text-xs text-stone">{prompt.lines} lines · {formatBytes(prompt.size)}</p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 ${activeId === prompt.id ? 'text-sand' : 'text-stone/40'}`} />
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border-custom overflow-hidden">
            {promptData?.exists ? (
              <>
                <div className="flex items-center justify-end px-4 py-2 border-b border-border-custom">
                  <CopyButton text={promptData.content} />
                </div>
                <div className="p-6 overflow-auto max-h-[calc(100vh-18rem)]">
                  <MarkdownRenderer content={promptData.content} />
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-stone text-sm">Select a prompt to view.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
