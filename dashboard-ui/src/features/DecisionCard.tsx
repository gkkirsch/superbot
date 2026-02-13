import { useState } from 'react'
import { MessageCircleQuestion, ChevronDown, ChevronUp, Check, CheckCircle2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveDecision } from '@/lib/api'
import type { Decision } from '@/lib/types'

const spaceColors: Record<string, string> = {
  hostreply: 'bg-ember/15 text-ember border-ember/20',
  'dashboard-ui': 'bg-sand/15 text-sand border-sand/20',
  consulting: 'bg-moss/15 text-moss border-moss/20',
  'x-content': 'bg-[#7c6fbd]/15 text-[#9b8fd4] border-[#7c6fbd]/20',
  general: 'bg-stone/15 text-stone border-stone/20',
}

interface DecisionCardProps {
  decision: Decision
  showSpace?: boolean
}

export function DecisionCard({ decision, showSpace = true }: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ id, resolution, space }: { id: number; resolution: string; space?: string | null }) =>
      resolveDecision(id, resolution, space),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions'] })
      queryClient.invalidateQueries({ queryKey: ['space-decisions'] })
      setResolving(false)
    },
  })

  const handleResolve = (label: string) => {
    setResolving(true)
    mutation.mutate({ id: decision.id, resolution: label, space: decision.space })
  }

  return (
    <div className="rounded-lg border border-sand/20 bg-sand/[0.03] overflow-hidden transition-all duration-200 hover:border-sand/35">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left group"
      >
        <MessageCircleQuestion className="h-4 w-4 text-sand shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {showSpace && decision.space && (
              <span className={`text-[10px] font-mono rounded-full px-2 py-0.5 border ${spaceColors[decision.space] ?? spaceColors.general}`}>
                {decision.space}
              </span>
            )}
          </div>
          <p className="text-sm text-parchment font-medium leading-snug">
            {decision.question}
          </p>
        </div>
        <div className="shrink-0 mt-0.5">
          {expanded
            ? <ChevronUp className="h-4 w-4 text-stone/50 group-hover:text-stone" />
            : <ChevronDown className="h-4 w-4 text-stone/50 group-hover:text-stone" />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-up" style={{ animationDuration: '0.2s' }}>
          {decision.context && (
            <p className="text-xs text-stone/80 leading-relaxed ml-7">
              {decision.context}
            </p>
          )}
          {decision.status === 'pending' && (
            <div className="ml-7 space-y-2">
              {decision.suggestedAnswers.map((answer) => (
                <button
                  key={answer.label}
                  onClick={() => handleResolve(answer.label)}
                  disabled={resolving}
                  className="w-full text-left rounded-md border border-border-custom bg-surface/50 px-3 py-2.5 transition-all duration-150 hover:border-sand/40 hover:bg-surface group/answer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border border-stone/30 shrink-0 flex items-center justify-center group-hover/answer:border-sand/60 transition-colors">
                      <Check className="h-2.5 w-2.5 text-sand opacity-0 group-hover/answer:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm text-parchment font-medium">{answer.label}</span>
                  </div>
                  {answer.description && (
                    <p className="text-xs text-stone/70 mt-1 ml-6">{answer.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {decision.status === 'resolved' && (
        <div className="px-4 pb-3 ml-7">
          <div className="flex items-center gap-1.5 text-xs text-moss">
            <CheckCircle2 className="h-3 w-3" />
            <span>Resolved: {decision.resolution}</span>
          </div>
        </div>
      )}
    </div>
  )
}
