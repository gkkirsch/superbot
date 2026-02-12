import { useConfig } from '@/hooks/useSpaces'

function redactSecrets(obj: unknown): unknown {
  if (typeof obj === 'string') {
    if (obj.startsWith('xoxb-') || obj.startsWith('xapp-') || obj.startsWith('sk-')) {
      return obj.slice(0, 8) + '...' + obj.slice(-4)
    }
    return obj
  }
  if (Array.isArray(obj)) return obj.map(redactSecrets)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, redactSecrets(v)])
    )
  }
  return obj
}

export function Config() {
  const { data, isLoading, error } = useConfig()

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Config</h1>
      <p className="text-sm text-stone mb-6">
        Superbot configuration from <code className="bg-codebg rounded px-1.5 py-0.5 text-xs font-mono text-sand">~/.superbot/config.json</code>. Secrets are redacted.
      </p>

      {isLoading && <div className="h-64 rounded bg-stone/5 animate-pulse" />}
      {error && <p className="text-sm text-ember">Error: {error.message}</p>}

      {data && (
        <pre className="bg-codebg rounded-lg p-6 overflow-auto text-xs font-mono text-parchment max-h-[calc(100vh-16rem)] border border-border-custom">
          {JSON.stringify(redactSecrets(data), null, 2)}
        </pre>
      )}
    </div>
  )
}
