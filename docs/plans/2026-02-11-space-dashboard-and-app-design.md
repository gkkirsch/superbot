# Space Dashboard & App Design

## Context

Spaces currently have a standard set of components (tasks, docs, overview) that serve the agent's workflow. There's no way for workers to create visual, user-facing content that lives within a space. We want workers to be able to build rich experiences for the user -- both standalone websites/apps and native dashboard content that augments the space detail page.

Additionally, the project has three overlapping UI codebases that need consolidation:
- `dashboard/dashboard.html` -- original vanilla JS dashboard (deprecated)
- `dashboard-ui/` -- early React prototype, spaces-only (deprecated)
- `spaces-ui/` -- full React/TypeScript SPA (current, most complete)

## Design

### Two-Layer Architecture

Every space can optionally have two types of user-facing content:

**1. `dashboard.jsx` -- Native dashboard content**
- A React component file at `~/.superbot/spaces/<slug>/dashboard.jsx`
- Dynamically loaded into the space's detail page in the dashboard UI
- Rendered as a "Dashboard" tab (first tab when present, before Tasks/Overview/Docs)
- Receives `space` (space.json data) and `tasks` as props
- Use cases: changelog/what's new, feature highlights, status visuals, research summaries, getting started guides
- For simpler spaces, this can be the primary deliverable

**2. `app/` -- Standalone website**
- A full website or application at `~/.superbot/spaces/<slug>/app/`
- Runs independently (own dev server, or static files)
- The dashboard links to it but doesn't embed it
- `space.json` gets `appPort` or `appUrl` field so the dashboard knows how to link
- `dashboard.jsx` serves as the companion view (changelog, setup instructions, feature cards)
- Use cases: product websites, prototypes, full applications

### Space Directory Structure (Updated)

```
spaces/<slug>/
  dashboard.jsx          # Optional - loaded into SpaceDetail as native tab
  app/                   # Optional - standalone website/app
    index.html
    src/
    package.json
  space.json
  OVERVIEW.md
  docs/
  tasks/
```

### How dashboard.jsx Works

**What the worker writes:**

```jsx
export default function SpaceDashboard({ space, tasks }) {
  const completed = tasks.filter(t => t.status === 'completed').length
  return (
    <div>
      <h2>What's New</h2>
      <ul>
        <li>Added user authentication flow</li>
        <li>Redesigned the landing page</li>
      </ul>
      <h2>Progress</h2>
      <p>{completed} of {tasks.length} tasks completed</p>
    </div>
  )
}
```

Workers write plain JSX with inline styles. They receive `space` and `tasks` as props.

**Server compilation pipeline:**

1. New endpoint: `GET /api/spaces/:slug/dashboard`
2. Reads `dashboard.jsx` from the space directory
3. Compiles with esbuild's `transform` API (JSX to browser-ready ES module, ~5ms)
4. Returns compiled JS with `Content-Type: application/javascript`

**Dashboard UI loading:**

1. SpaceDetail checks `hasDashboard` field on the space API response
2. If true, shows "Dashboard" as the first tab
3. Tab component uses dynamic `import()` to load the compiled module
4. Renders the default export as a React component with space data as props
5. Wrapped in an error boundary for resilience

**Fallback:** Spaces without `dashboard.jsx` look exactly as they do today.

### Workers Create dashboard.jsx When Relevant

Workers decide based on space type -- not every space needs one:
- Product/website spaces: yes, as a companion to `app/`
- Research/planning spaces: yes, for visual summaries and findings
- Quick one-off task spaces: probably not

Workers should update `dashboard.jsx` after notable work to reflect current state.

## Implementation

### 1. Cleanup & Rename

- Delete `dashboard/dashboard.html`
- Delete `dashboard-ui/` directory entirely
- Rename `spaces-ui/` to `dashboard-ui/`
- Update `dashboard/server.js`: change `SPACES_UI_DIST` to point to `dashboard-ui/dist`

### 2. Server Changes (`dashboard/server.js`)

- Add `esbuild` as a dependency
- New endpoint `GET /api/spaces/:slug/dashboard`:
  - Read `~/.superbot/spaces/<slug>/dashboard.jsx`
  - Compile with `esbuild.transform(code, { loader: 'jsx', format: 'esm' })`
  - Return compiled JS
- Add `hasDashboard` boolean to `GET /api/spaces/:slug` response
- Serve `app/` static files: mount `/spaces/:slug/app/` route

### 3. Dashboard UI Changes (`dashboard-ui/`)

- `SpaceDetail.tsx`: add "Dashboard" tab, shown first when `hasDashboard` is true
- New component `SpaceDashboard.tsx`:
  - Dynamic `import()` of `/api/spaces/:slug/dashboard`
  - Error boundary wrapping
  - Passes `{ space, tasks }` as props to the loaded component
- Dashboard tab becomes the default when it exists; otherwise Tasks remains default

### 4. Prompt Changes

**Worker prompt (`scripts/worker-prompt.md`):**
- New section on creating `dashboard.jsx` -- when to create one, what props are available, styling guidance (dark theme, inline styles)
- New section on `app/` -- building standalone sites within a space
- Guidance on updating `dashboard.jsx` after each session to reflect latest work

**Orchestrator prompt (`templates/SYSTEM.md`):**
- Awareness that spaces can have `dashboard.jsx` and `app/`
- When reviewing worker output, check if dashboard was updated
- When posting results to Slack, mention if the space has a visual dashboard

### 5. Onboarding

- Start the dashboard server after onboarding completes

## Verification

1. Rename and cleanup: confirm `dashboard-ui/` builds and serves correctly from `server.js`
2. Create a test `dashboard.jsx` in a space, hit `/api/spaces/:slug/dashboard` endpoint, verify compiled JS is returned
3. Load a space with `dashboard.jsx` in the UI, confirm the Dashboard tab appears and renders the component
4. Load a space without `dashboard.jsx`, confirm no changes to existing behavior
5. Review updated worker/orchestrator prompts for clarity
