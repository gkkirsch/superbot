import { useQuery } from '@tanstack/react-query'
import {
  fetchSpaces, fetchSpace, fetchSpaceTasks, fetchSpaceDocs, fetchDocContent, fetchSpaceOverview,
  fetchIdentity, fetchUser, fetchMemory, fetchHeartbeat, fetchOnboard,
  fetchDailyNotes, fetchDailyNote, fetchSessions,
  fetchTeam, fetchInbox, fetchTasks,
  fetchConfig, fetchSkills, fetchSchedule, fetchLogs, fetchLogContent,
  fetchPrompts, fetchPromptContent,
  fetchDocsPage,
} from '@/lib/api'

// --- Spaces ---

export function useSpaces() {
  return useQuery({ queryKey: ['spaces'], queryFn: fetchSpaces, staleTime: 30_000 })
}

export function useSpace(slug: string) {
  return useQuery({ queryKey: ['space', slug], queryFn: () => fetchSpace(slug), enabled: !!slug, staleTime: 30_000 })
}

export function useSpaceTasks(slug: string) {
  return useQuery({ queryKey: ['space-tasks', slug], queryFn: () => fetchSpaceTasks(slug), enabled: !!slug, staleTime: 15_000 })
}

export function useSpaceDocs(slug: string) {
  return useQuery({ queryKey: ['space-docs', slug], queryFn: () => fetchSpaceDocs(slug), enabled: !!slug, staleTime: 30_000 })
}

export function useDocContent(slug: string, docPath: string) {
  return useQuery({ queryKey: ['doc-content', slug, docPath], queryFn: () => fetchDocContent(slug, docPath), enabled: !!slug && !!docPath, staleTime: 60_000 })
}

export function useSpaceOverview(slug: string) {
  return useQuery({ queryKey: ['space-overview', slug], queryFn: () => fetchSpaceOverview(slug), enabled: !!slug, staleTime: 30_000 })
}

// --- Context files ---

export function useIdentity() {
  return useQuery({ queryKey: ['identity'], queryFn: fetchIdentity, staleTime: 60_000 })
}

export function useUser() {
  return useQuery({ queryKey: ['user'], queryFn: fetchUser, staleTime: 60_000 })
}

export function useMemory() {
  return useQuery({ queryKey: ['memory'], queryFn: fetchMemory, staleTime: 30_000 })
}

export function useHeartbeat() {
  return useQuery({ queryKey: ['heartbeat'], queryFn: fetchHeartbeat, staleTime: 15_000 })
}

export function useOnboard() {
  return useQuery({ queryKey: ['onboard'], queryFn: fetchOnboard, staleTime: 60_000 })
}

// --- Activity ---

export function useDailyNotes() {
  return useQuery({ queryKey: ['daily-notes'], queryFn: fetchDailyNotes, staleTime: 30_000 })
}

export function useDailyNote(date: string) {
  return useQuery({ queryKey: ['daily-note', date], queryFn: () => fetchDailyNote(date), enabled: !!date, staleTime: 30_000 })
}

export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: fetchSessions, staleTime: 15_000 })
}

// --- Team ---

export function useTeam() {
  return useQuery({ queryKey: ['team'], queryFn: fetchTeam, staleTime: 30_000 })
}

export function useInbox() {
  return useQuery({ queryKey: ['inbox'], queryFn: fetchInbox, staleTime: 15_000 })
}

export function useGlobalTasks() {
  return useQuery({ queryKey: ['global-tasks'], queryFn: fetchTasks, staleTime: 15_000 })
}

// --- System ---

export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: fetchConfig, staleTime: 60_000 })
}

export function useSkills() {
  return useQuery({ queryKey: ['skills'], queryFn: fetchSkills, staleTime: 60_000 })
}

export function useSchedule() {
  return useQuery({ queryKey: ['schedule'], queryFn: fetchSchedule, staleTime: 60_000 })
}

export function useLogs() {
  return useQuery({ queryKey: ['logs'], queryFn: fetchLogs, staleTime: 30_000 })
}

export function useLogContent(name: string) {
  return useQuery({ queryKey: ['log-content', name], queryFn: () => fetchLogContent(name), enabled: !!name, staleTime: 15_000 })
}

// --- Prompts ---

export function usePrompts() {
  return useQuery({ queryKey: ['prompts'], queryFn: fetchPrompts, staleTime: 60_000 })
}

export function usePromptContent(id: string) {
  return useQuery({ queryKey: ['prompt-content', id], queryFn: () => fetchPromptContent(id), enabled: !!id, staleTime: 60_000 })
}

// --- Docs ---

export function useDocsPage(slug: string) {
  return useQuery({ queryKey: ['docs-page', slug], queryFn: () => fetchDocsPage(slug), enabled: !!slug, staleTime: 120_000 })
}
