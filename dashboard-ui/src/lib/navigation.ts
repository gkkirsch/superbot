import { LayoutGrid, Activity, Settings, BookOpen, Gauge } from 'lucide-react'

export const topNavItems = [
  { to: '/', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/spaces', label: 'Spaces', icon: LayoutGrid },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/system', label: 'System', icon: Settings },
  { to: '/docs', label: 'Docs', icon: BookOpen },
]

export const secondaryNavItems: Record<string, { to: string; label: string }[]> = {
  activity: [
    { to: '/activity/daily', label: 'Daily Notes' },
    { to: '/activity/sessions', label: 'Sessions' },
  ],
  system: [
    { to: '/system/context', label: 'Context' },
    { to: '/system/team', label: 'Team' },
    { to: '/system/config', label: 'Config' },
    { to: '/system/skills', label: 'Skills' },
    { to: '/system/schedule', label: 'Schedule' },
    { to: '/system/logs', label: 'Logs' },
    { to: '/system/prompts', label: 'Prompts' },
  ],
}

export const docsNavItems = [
  {
    group: null,
    items: [{ to: '/docs', label: 'Getting Started', end: true }],
  },
  {
    group: 'Features',
    items: [
      { to: '/docs/commands', label: 'Commands' },
      { to: '/docs/memory', label: 'Memory' },
      { to: '/docs/heartbeat', label: 'Heartbeat' },
      { to: '/docs/scheduler', label: 'Scheduler' },
      { to: '/docs/slack', label: 'Slack' },
      { to: '/docs/skills', label: 'Skills' },
    ],
  },
  {
    group: 'Reference',
    items: [
      { to: '/docs/architecture', label: 'Architecture' },
      { to: '/docs/prompt', label: 'System Prompt' },
      { to: '/docs/files', label: 'File Reference' },
    ],
  },
]
