import { useState } from 'react'
import { Calendar, FileText } from 'lucide-react'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { useDailyNotes, useDailyNote } from '@/hooks/useSpaces'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function DailyNotes() {
  const { data: notes, isLoading } = useDailyNotes()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const activeDate = selectedDate ?? notes?.[0]?.date ?? null
  const { data: noteContent } = useDailyNote(activeDate ?? '')

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Daily Notes</h1>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-stone/5 animate-pulse" />
          ))}
        </div>
      )}

      {notes && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          <div className="rounded-lg border border-border-custom overflow-hidden divide-y divide-border-custom max-h-[calc(100vh-14rem)] overflow-y-auto">
            {notes.map((note) => (
              <button
                key={note.date}
                onClick={() => setSelectedDate(note.date)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  activeDate === note.date
                    ? 'bg-sand/10 border-l-2 border-sand'
                    : 'hover:bg-surface/50 border-l-2 border-transparent'
                }`}
              >
                <Calendar className={`h-4 w-4 shrink-0 ${activeDate === note.date ? 'text-sand' : 'text-stone'}`} />
                <span className={`text-sm ${activeDate === note.date ? 'text-parchment font-medium' : 'text-stone'}`}>
                  {formatDate(note.date)}
                </span>
              </button>
            ))}
            {notes.length === 0 && (
              <div className="px-4 py-8 text-center text-stone text-sm">No daily notes yet.</div>
            )}
          </div>

          <div className="rounded-lg border border-border-custom overflow-hidden">
            {activeDate && noteContent?.exists ? (
              <div className="p-6 overflow-auto max-h-[calc(100vh-14rem)]">
                <MarkdownRenderer content={noteContent.content} />
              </div>
            ) : activeDate && noteContent && !noteContent.exists ? (
              <div className="p-6 text-center text-stone">
                <FileText className="h-8 w-8 mx-auto mb-2 text-stone/40" />
                <p className="text-sm">No content for this date.</p>
              </div>
            ) : (
              <div className="p-6 text-center text-stone">
                <p className="text-sm">Select a date to view notes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
