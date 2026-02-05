---
description: Show overview of superbot state - memory, tasks, daily notes
allowed-tools: Read, Bash, Glob
---

Show an overview of all superbot state.

## What to display

Read and summarize the following files from `~/.superbot/`:

1. **Identity** — First few lines of `IDENTITY.md` (if exists)
2. **Memory** — Summary of `MEMORY.md` entries (count and recent items)
3. **Heartbeat** — Pending tasks from `HEARTBEAT.md` (count pending vs done)
4. **Daily Notes** — Whether today's notes exist and how many entries
5. **Heartbeat Status** — Last activity from the Activity Log section

## Format

Present as a clean summary, not raw file dumps. Example:

```
Superbot Status
────────────────
Identity:  Loaded (custom persona)
Memory:    12 entries
Heartbeat: 2 pending, 5 done
Daily:     3 notes for today
Cron:      Last check 30 min ago — no work needed
```

If `~/.superbot/` doesn't exist, tell the user to run setup first.
