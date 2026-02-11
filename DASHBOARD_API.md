# Superbot Dashboard API Documentation

**Server**: Express.js running on port 3274
**Base URL**: `http://localhost:3274`

---

## Table of Contents

1. [Core Context Files](#core-context-files)
2. [Daily Notes](#daily-notes)
3. [Sessions & Team](#sessions--team)
4. [Inboxes](#inboxes)
5. [Logs](#logs)
6. [Configuration](#configuration)
7. [Skills & Tasks](#skills--tasks)
8. [Schedule](#schedule)
9. [Status & Health](#status--health)
10. [Spaces](#spaces)

---

## Core Context Files

### GET /api/identity
Retrieves the bot's identity context file.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/identity` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean }` |

---

### GET /api/user
Retrieves the user context file.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/user` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean }` |

---

### GET /api/memory
Retrieves the memory context file.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/memory` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean }` |

---

### GET /api/heartbeat
Retrieves the heartbeat context file.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/heartbeat` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean }` |

---

### GET /api/onboard
Retrieves the onboarding context file.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/onboard` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean }` |

---

## Daily Notes

### GET /api/daily
Lists all daily note files with metadata.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/daily` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ files: Array<{ date: string, filename: string, size: number }> }` |
| **Notes** | Files sorted reverse chronologically (newest first) |

---

### GET /api/daily/:date
Retrieves a specific daily note by date.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/daily/:date` |
| **Path Parameters** | `date` - Date string (e.g., `2024-02-10`) |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean }` |
| **Notes** | Only alphanumeric and hyphen characters allowed in date |

---

## Sessions & Team

### GET /api/sessions
Retrieves all recorded sessions.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/sessions` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ sessions: Array<any> }` |
| **Notes** | Returns from `sessions.json` file |

---

### GET /api/team
Retrieves team configuration and members.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/team` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ members: Array<any> }` |
| **Notes** | Returns from team `config.json` file |

---

## Inboxes

### GET /api/inbox
Lists all inboxes with message counts.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/inbox` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ inboxes: Array<{ name: string, total: number, unread: number }> }` |

---

### GET /api/inbox/:name
Retrieves all messages from a specific inbox.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/inbox/:name` |
| **Path Parameters** | `name` - Inbox name (alphanumeric, hyphens, underscores only) |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ name: string, messages: Array<{ read: boolean, ... }> }` |

---

## Logs

### GET /api/logs
Lists all available log files (last 50 lines each).

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/logs` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ logs: Array<{ name: string, exists: boolean, lines: string }> }` |
| **Allowed Logs** | `heartbeat.log`, `slack-bot.log`, `scheduler.log`, `observer.log`, `worker.log` |

---

### GET /api/logs/:name
Retrieves a specific log file (last 100 lines).

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/logs/:name` |
| **Path Parameters** | `name` - Log filename |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ name: string, exists: boolean, lines: string }` |
| **Status Codes** | `403` - Log file not in allowed list |
| **Allowed Logs** | `heartbeat.log`, `slack-bot.log`, `scheduler.log`, `observer.log`, `worker.log` |

---

## Configuration

### GET /api/config
Retrieves the main configuration file with sensitive tokens redacted.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/config` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ [key: string]: any }` |
| **Notes** | Tokens, secrets, keys, passwords are redacted as `***` |

---

## Skills & Tasks

### GET /api/skills
Lists all installed skills with symlink information.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/skills` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ skills: Array<{ name: string, isSymlink: boolean, target: string \| null }> }` |

---

### GET /api/tasks
Lists all tasks grouped by directory.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/tasks` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ groups: Array<{ name: string, tasks: Array<any> }> }` |

---

## Schedule

### GET /api/schedule
Retrieves schedule configuration and last run time.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/schedule` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ schedule: Array<any>, lastRun: any }` |

---

## Status & Health

### GET /api/status
Retrieves comprehensive system status and health information.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/status` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | See below |

**Response Details**:
```json
{
  "fileChecks": [
    {
      "name": "IDENTITY.md",
      "exists": boolean,
      "lines": number
    }
  ],
  "dailyCount": number,
  "activeSessions": number,
  "totalSessions": number,
  "pendingTasks": number,
  "totalUnread": number,
  "launchdRunning": boolean,
  "timestamp": string (ISO 8601)
}
```

---

## Spaces

### GET /api/spaces
Lists all spaces with summary statistics.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/spaces` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ spaces: Array<SpaceWithStats> }` |

**Space Object with Stats**:
```json
{
  "...spaceJson": {},
  "taskCounts": {
    "pending": number,
    "in_progress": number,
    "completed": number,
    "total": number
  },
  "docCount": number,
  "lastUpdated": string (ISO 8601) | null
}
```

---

### GET /api/spaces/:slug
Retrieves full details for a specific space.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/spaces/:slug` |
| **Path Parameters** | `slug` - Space identifier (alphanumeric, hyphens, underscores only) |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ space: object, plan: FileContent, readme: FileContent }` |
| **Status Codes** | `400` - Invalid slug | `404` - Space not found |

**FileContent**:
```json
{
  "content": string,
  "exists": boolean
}
```

---

### GET /api/spaces/:slug/tasks
Retrieves all tasks for a specific space, sorted by priority.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/spaces/:slug/tasks` |
| **Path Parameters** | `slug` - Space identifier (alphanumeric, hyphens, underscores only) |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ tasks: Array<Task> }` |
| **Status Codes** | `400` - Invalid slug |
| **Sorting** | By priority (critical → high → medium → low), then by ID |

**Priority Rank**: `critical` (0), `high` (1), `medium` (2), `low` (3)

---

### GET /api/spaces/:slug/docs
Lists all documentation files for a space (recursive).

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/spaces/:slug/docs` |
| **Path Parameters** | `slug` - Space identifier (alphanumeric, hyphens, underscores only) |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ docs: Array<DocMetadata> }` |
| **Status Codes** | `400` - Invalid slug |

**DocMetadata**:
```json
{
  "name": string,
  "relativePath": string,
  "size": number (bytes),
  "modified": string (ISO 8601)
}
```

---

### GET /api/spaces/:slug/docs/*
Retrieves content of a specific documentation file.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/spaces/:slug/docs/*` |
| **Path Parameters** | `slug` - Space identifier; `*` - Relative path to doc file |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean, path: string }` |
| **Status Codes** | `400` - Invalid slug or path |
| **Security** | Path traversal (`..`) blocked; resolved path must stay within docs directory |

---

### GET /api/spaces/:slug/overview
Retrieves the OVERVIEW.md file for a space (shortcut).

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/api/spaces/:slug/overview` |
| **Path Parameters** | `slug` - Space identifier (alphanumeric, hyphens, underscores only) |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response Shape** | `{ content: string, exists: boolean }` |
| **Status Codes** | `400` - Invalid slug |

---

## Root Route

### GET /
Serves the dashboard HTML file.

| Property | Value |
|----------|-------|
| **HTTP Method** | GET |
| **Path** | `/` |
| **Query Parameters** | None |
| **Body Parameters** | None |
| **Response** | HTML file (`dashboard.html`) |

---

## Common Features

### Input Validation

- **Slug Validation**: Path parameters like `slug` only allow alphanumeric characters, hyphens, and underscores
- **Path Safety**: Wildcard paths are checked to prevent directory traversal attacks
- **Log Allowlist**: Only specific log files can be accessed via the `/api/logs/:name` endpoint

### Sensitive Data Handling

- **Token Redaction**: Configuration endpoint redacts tokens matching patterns:
  - `xoxb-*` (Slack Bot tokens)
  - `xapp-*` (Slack App tokens)
  - `xoxp-*` (Slack User tokens)
  - `sk-*` (OpenAI tokens)
  - `ghp_*` (GitHub tokens)
  - `ghu_*` (GitHub tokens)
  - Keys with names containing: `token`, `secret`, `key`, `password` (case-insensitive)

### Error Handling

- Returns `{ error: string }` with appropriate HTTP status codes
- Common status codes: `400` (invalid input), `403` (forbidden), `404` (not found)

---

## Directory Structure Reference

The API reads from these key directories:

- `~/.superbot/` - Core bot files (IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, ONBOARD.md)
- `~/.superbot/daily/` - Daily note files (.md)
- `~/.superbot/logs/` - Log files
- `~/.superbot/spaces/` - Space projects with nested tasks and docs
- `~/.claude/teams/superbot/` - Team configuration and inboxes
- `~/.claude/skills/` - Skills directory
- `~/.claude/tasks/` - Tasks organized by group

