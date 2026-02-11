<p align="center">
  <img src="docs/superbotlogo.png" alt="Superbot" width="400" />
</p>

# Superbot Plugin for Claude Code

A Claude Code plugin that adds superbot capabilities - heartbeat tasks, persistent memory, auto-populated daily notes, and identity continuity across sessions.

## Features

- **Heartbeat System** - Background task processing via cron/launchd
- **Persistent Memory** - Context that survives session compaction
- **Daily Notes** - Auto-populated history via session observer + heartbeat worker
- **Identity Continuity** - Consistent persona across all sessions
- **User Profile** - Preferences and context about who Claude is helping
- **Slack Integration** - DM and @mention routing with threaded conversations
- **Scheduler** - Cron-like scheduled jobs (daily briefings, reminders)
- **Space Management** - Multi-space task tracking and work orders
- **Spaces Dashboard** - Web UI for managing spaces, tasks, and documentation

## Quick Start

```bash
# One-liner install
curl -fsSL https://raw.githubusercontent.com/gkkirsch/superbot/main/install.sh | bash
```

Or manually:

```bash
# 1. Clone the repo
git clone https://github.com/gkkirsch/superbot.git ~/.superbot-plugin

# 2. Run setup
~/.superbot-plugin/scripts/setup.sh
```

Setup will:
- Install Claude Code if not present
- Create config files in `~/.superbot/`
- Install skills and plugins
- Launch interactive onboarding

### Running Superbot

```bash
# Start superbot (uses the plugin directory)
~/.superbot-plugin/superbot

# Or with the alias (added to your shell profile by setup)
superbot
```

## Usage

### Commands

```
/superbot status                        # Overview of everything
/superbot restart                       # Resume session with fresh context
/superbot skills                        # Browse and install skills
/superbot onboard                       # Run interactive onboarding
```

### Scripts

```bash
~/.superbot-plugin/scripts/status.sh           # Quick status check
~/.superbot-plugin/scripts/doctor.sh           # Full diagnostics
~/.superbot-plugin/scripts/test-triage.sh      # Test triage decision
~/.superbot-plugin/scripts/test-worker.sh      # Dry-run worker
```

## Dashboard

The **Spaces Dashboard** provides a web-based UI for managing your Superbot spaces and tasks.

**Access**: http://localhost:3274/

### Features

- View all spaces with status indicators (active, archived, paused)
- Monitor task counts per space (pending, in progress, completed)
- Track documentation per space
- Filter spaces by status
- See last updated timestamps
- Responsive design for mobile and desktop

### Getting Started

1. **Build the frontend**:
   ```bash
   cd ~/dev/superbot/dashboard-ui
   npm install
   npm run build
   ```

2. **Start the dashboard server**:
   ```bash
   cd ~/dev/superbot/dashboard
   node server.js
   ```

3. **Open in browser**:
   ```bash
   open http://localhost:3274/
   ```

### Documentation

- **[DASHBOARD_GUIDE.md](./DASHBOARD_GUIDE.md)** - Complete dashboard documentation
  - Architecture and tech stack
  - Building and deployment
  - API integration details
  - Adding new features
  - Troubleshooting guide

- **[DASHBOARD_API.md](./DASHBOARD_API.md)** - REST API endpoint documentation
  - Spaces endpoints
  - System status endpoints
  - Configuration and logs
  - Full API reference

### Development

For development with hot reload:

```bash
cd ~/dev/superbot/dashboard-ui
npm run dev
# Runs on http://localhost:5173/
```

### Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Express.js on port 3274
- **Data**: File-based (reads from ~/.superbot/spaces/)

## Files

All config files live in `~/.superbot/`:

| File | Purpose |
|------|---------|
| `IDENTITY.md` | Claude's persona and behavior |
| `USER.md` | Info about you |
| `MEMORY.md` | Persistent notes |
| `HEARTBEAT.md` | Tasks and activity log |
| `daily/*.md` | Daily notes (auto-populated) |

## How It Works

1. **SessionStart hook** injects context files when you start Claude or after compaction
2. **System prompt** teaches Claude how to use memory, notes, and heartbeat proactively
3. **Heartbeat cron** (every 30 min) runs a cheap triage check
4. If work is needed, a **worker session** processes tasks
5. Worker writes results back to `HEARTBEAT.md`
6. Next time you start Claude, you see what the worker did

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Session                              │
│  (claude --plugin-dir ~/.superbot-plugin)                   │
│                                                              │
│  SessionStart Hook → inject-context.sh                      │
│  ├── SYSTEM.md (instructions)                               │
│  ├── IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md         │
│  ├── daily/today.md + yesterday.md                         │
│  └── .observer-offset (incremental parsing)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Background (launchd, every 30 min)          │
│                                                              │
│  heartbeat-cron.sh                                          │
│  ├── daily-observer.sh → parse session, update daily notes  │
│  ├── triage.sh (haiku) → "YES" if work needed              │
│  └── worker (opus) → processes HEARTBEAT.md tasks            │
└─────────────────────────────────────────────────────────────┘
```

## Workflow

### Daily
1. Start Claude: context is automatically loaded (memory, daily notes, identity)
2. Work on tasks — daily notes are auto-populated by the session observer
3. Claude proactively updates MEMORY.md when learning useful things
4. End of day: review daily notes, promote important learnings to MEMORY.md

### Background
1. Ask superbot to add heartbeat tasks (edits HEARTBEAT.md)
2. launchd runs every 30 minutes: observer parses session, triage checks for tasks
3. If tasks exist, worker processes them
4. Results appear in HEARTBEAT.md and daily notes

## Configuration

After setup, edit `~/.superbot/config.json` to configure:

- `spacesDir` — where to create user spaces (default: `~/spaces`)
- `defaultModel` — model for general use
- `slack.botToken` / `slack.appToken` — Slack integration tokens
- `schedule` — array of scheduled jobs
- `heartbeat.intervalMinutes` — how often the heartbeat worker runs

## Uninstall

```bash
# Remove everything (state, services, skills, shell config)
~/.superbot-plugin/scripts/uninstall.sh

# Then remove the plugin directory itself
rm -rf ~/.superbot-plugin
```
