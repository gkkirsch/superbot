import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useLogs, useLogContent } from '@/hooks/useSpaces'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function Logs() {
  const { data, isLoading } = useLogs()
  const [selectedLog, setSelectedLog] = useState<string | null>(null)

  const activeName = selectedLog ?? data?.logs?.[0]?.name ?? null
  const { data: logContent, isLoading: contentLoading } = useLogContent(activeName ?? '')

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Logs</h1>

      {isLoading && <div className="h-64 rounded bg-stone/5 animate-pulse" />}

      {data?.logs && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
          <div className="rounded-lg border border-border-custom overflow-hidden divide-y divide-border-custom">
            {data.logs.map((log) => (
              <button
                key={log.name}
                onClick={() => setSelectedLog(log.name)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${
                  activeName === log.name
                    ? 'bg-sand/10 border-l-2 border-sand'
                    : 'hover:bg-surface/50 border-l-2 border-transparent'
                }`}
              >
                <FileText className={`h-3.5 w-3.5 shrink-0 ${activeName === log.name ? 'text-sand' : 'text-stone'}`} />
                <div className="min-w-0">
                  <p className={`text-xs truncate ${activeName === log.name ? 'text-parchment font-medium' : 'text-stone'}`}>
                    {log.name}
                  </p>
                  <p className="text-[10px] text-stone/50">{formatBytes(log.size)}</p>
                </div>
              </button>
            ))}
            {data.logs.length === 0 && (
              <div className="px-3 py-8 text-center text-stone text-xs">No log files.</div>
            )}
          </div>

          <div className="rounded-lg border border-border-custom overflow-hidden">
            {contentLoading && <div className="h-64 animate-pulse bg-stone/5" />}
            {logContent?.exists ? (
              <pre className="p-4 overflow-auto text-xs font-mono text-stone max-h-[calc(100vh-16rem)] bg-codebg">
                {logContent.content}
              </pre>
            ) : logContent && !logContent.exists ? (
              <div className="p-6 text-center text-stone text-sm">Log file is empty.</div>
            ) : !contentLoading ? (
              <div className="p-6 text-center text-stone text-sm">Select a log file.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
