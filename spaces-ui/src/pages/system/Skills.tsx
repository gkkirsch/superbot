import { Puzzle } from 'lucide-react'
import { useSkills } from '@/hooks/useSpaces'

export function Skills() {
  const { data, isLoading, error } = useSkills()

  return (
    <div>
      <h1 className="font-heading text-3xl text-parchment mb-6">Skills</h1>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-stone/5 animate-pulse" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-ember">Error: {error.message}</p>}

      {data?.skills && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.skills.map((skill) => (
            <div key={skill.name} className="rounded-lg border border-border-custom p-4 hover:border-sand/30 transition-colors">
              <div className="flex items-start gap-3">
                <Puzzle className="h-5 w-5 text-sand shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-sm font-heading text-parchment truncate">{skill.name}</h3>
                  {skill.description && (
                    <p className="text-xs text-stone mt-1 line-clamp-2">{skill.description}</p>
                  )}
                  <p className="text-[10px] text-stone/50 mt-1.5 font-mono truncate">{skill.path}</p>
                </div>
              </div>
            </div>
          ))}
          {data.skills.length === 0 && (
            <p className="text-sm text-stone col-span-2 text-center py-12">No skills installed.</p>
          )}
        </div>
      )}
    </div>
  )
}
