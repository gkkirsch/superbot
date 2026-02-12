export interface SpaceOverview {
  name: string
  slug: string
  description: string
  codeDir: string | null
  status: string
  priority: string
  tags: string[]
  techStack: string[]
  urls: {
    production: string | null
    repo: string | null
  }
  taskCounts: {
    pending: number
    in_progress: number
    completed: number
    total: number
  }
  docCount: number
  lastUpdated: string | null
  createdAt: string
  updatedAt: string
}

export interface SpaceDetail {
  space: SpaceOverview
  overview: { content: string; exists: boolean }
}

export interface Task {
  id: number
  subject: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'critical' | 'high' | 'medium' | 'low'
  labels: string[]
  blocks: number[]
  blockedBy: number[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface DocFile {
  name: string
  relativePath: string
  size: number
  modified: string
}
