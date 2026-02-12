import type { SpaceOverview, SpaceDetail, Task, DocFile } from './types'

const API_BASE = '/api'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`)
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

// --- Spaces ---

export async function fetchSpaces(): Promise<SpaceOverview[]> {
  const data = await fetchJson<{ spaces: SpaceOverview[] }>('/spaces')
  return data.spaces
}

export async function fetchSpace(slug: string): Promise<SpaceDetail> {
  return fetchJson<SpaceDetail>(`/spaces/${slug}`)
}

export async function fetchSpaceTasks(slug: string): Promise<Task[]> {
  const data = await fetchJson<{ tasks: Task[] }>(`/spaces/${slug}/tasks`)
  return data.tasks
}

export async function fetchSpaceDocs(slug: string): Promise<DocFile[]> {
  const data = await fetchJson<{ docs: DocFile[] }>(`/spaces/${slug}/docs`)
  return data.docs
}

export async function fetchDocContent(slug: string, docPath: string): Promise<string> {
  const data = await fetchJson<{ content: string; exists: boolean }>(`/spaces/${slug}/docs/${docPath}`)
  return data.content
}

export async function fetchSpaceOverview(slug: string): Promise<{ content: string; exists: boolean }> {
  return fetchJson<{ content: string; exists: boolean }>(`/spaces/${slug}/overview`)
}

// --- Context files ---

export interface MarkdownFile {
  content: string
  exists: boolean
}

export async function fetchIdentity(): Promise<MarkdownFile> {
  return fetchJson<MarkdownFile>('/identity')
}

export async function fetchUser(): Promise<MarkdownFile> {
  return fetchJson<MarkdownFile>('/user')
}

export async function fetchMemory(): Promise<MarkdownFile> {
  return fetchJson<MarkdownFile>('/memory')
}

export async function fetchHeartbeat(): Promise<MarkdownFile> {
  return fetchJson<MarkdownFile>('/heartbeat')
}

export async function fetchOnboard(): Promise<MarkdownFile> {
  return fetchJson<MarkdownFile>('/onboard')
}

// --- Activity ---

export interface DailyNoteSummary {
  date: string
  size: number
}

export async function fetchDailyNotes(): Promise<DailyNoteSummary[]> {
  const data = await fetchJson<{ notes: DailyNoteSummary[] }>('/daily')
  return data.notes
}

export async function fetchDailyNote(date: string): Promise<MarkdownFile> {
  return fetchJson<MarkdownFile>(`/daily/${date}`)
}

export interface SessionInfo {
  id: string
  name: string
  type: string
  status: string
  space?: string
  slackThread?: { channel: string; threadTs: string }
  createdAt: string
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  const data = await fetchJson<{ sessions: SessionInfo[] }>('/sessions')
  return data.sessions
}

// --- Team ---

export async function fetchTeam(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>('/team')
}

export interface InboxMessage {
  from: string
  timestamp: string
  content: string
}

export async function fetchInbox(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>('/inbox')
}

export async function fetchTasks(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>('/tasks')
}

// --- System ---

export async function fetchConfig(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>('/config')
}

export interface SkillInfo {
  name: string
  description: string
  path: string
}

export async function fetchSkills(): Promise<{ skills: SkillInfo[] }> {
  return fetchJson<{ skills: SkillInfo[] }>('/skills')
}

export async function fetchSchedule(): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>('/schedule')
}

export interface LogFile {
  name: string
  size: number
  modified: string
}

export async function fetchLogs(): Promise<{ logs: LogFile[] }> {
  return fetchJson<{ logs: LogFile[] }>('/logs')
}

export async function fetchLogContent(name: string): Promise<{ content: string; exists: boolean }> {
  return fetchJson<{ content: string; exists: boolean }>(`/logs/${name}`)
}

// --- Prompts ---

export interface PromptSummary {
  id: string
  name: string
  exists: boolean
  size: number
  lines: number
}

export interface PromptDetail {
  id: string
  content: string
  exists: boolean
}

export async function fetchPrompts(): Promise<PromptSummary[]> {
  const data = await fetchJson<{ prompts: PromptSummary[] }>('/prompts')
  return data.prompts
}

export async function fetchPromptContent(id: string): Promise<PromptDetail> {
  return fetchJson<PromptDetail>(`/prompts/${id}`)
}

// --- Docs ---

export async function fetchDocsPage(slug: string): Promise<{ content: string; exists: boolean }> {
  return fetchJson<{ content: string; exists: boolean }>(`/docs/${slug}`)
}
