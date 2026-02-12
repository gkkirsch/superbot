import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Dashboard } from './pages/Dashboard'
import { Health } from './pages/Health'
import { SpacesOverview } from './pages/SpacesOverview'
import { SpaceDetail } from './pages/SpaceDetail'
import { SectionLayout } from './layouts/SectionLayout'
import { DocsLayout } from './layouts/DocsLayout'
import { DailyNotes } from './pages/activity/DailyNotes'
import { Sessions } from './pages/activity/Sessions'
import { ContextFiles } from './pages/system/ContextFiles'
import { TeamOverview } from './pages/system/TeamOverview'
import { Config } from './pages/system/Config'
import { Skills } from './pages/system/Skills'
import { Schedule } from './pages/system/Schedule'
import { Logs } from './pages/system/Logs'
import { Prompts } from './pages/system/Prompts'
import { DocsPage } from './pages/docs/DocsPage'

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Health */}
        <Route path="/health" element={<Health />} />

        {/* Spaces */}
        <Route path="/spaces" element={<SpacesOverview />} />
        <Route path="/spaces/:slug" element={<SpaceDetail />} />

        {/* Activity */}
        <Route path="/activity" element={<SectionLayout section="activity" />}>
          <Route index element={<Navigate to="daily" replace />} />
          <Route path="daily" element={<DailyNotes />} />
          <Route path="sessions" element={<Sessions />} />
        </Route>

        {/* System */}
        <Route path="/system" element={<SectionLayout section="system" />}>
          <Route index element={<Navigate to="context" replace />} />
          <Route path="context" element={<ContextFiles />} />
          <Route path="team" element={<TeamOverview />} />
          <Route path="config" element={<Config />} />
          <Route path="skills" element={<Skills />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="logs" element={<Logs />} />
          <Route path="prompts" element={<Prompts />} />
        </Route>

        {/* Docs */}
        <Route path="/docs" element={<DocsLayout />}>
          <Route index element={<DocsPage slug="getting-started" />} />
          <Route path=":slug" element={<DocsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
