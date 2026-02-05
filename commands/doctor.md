---
description: Diagnose and fix common superbot issues
allowed-tools: Read, Write, Edit, Bash, Glob
---

Run diagnostics on superbot's health. Check for problems, report findings, and offer to fix what you can.

## Infrastructure checks

First, run the infrastructure doctor script:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/doctor.sh"
```

This checks: Claude CLI, auth, Agent Teams env var, config directory, core files, script permissions, launchd, and team setup.

## Content checks

Then run these additional checks against file *contents* in `~/.superbot/`. Report results as a table with status icons: pass, warn, fail.

### 1. MEMORY.md size
Read the file and count lines.
- **fail** if >200 lines — this eats context window. Offer to help prune.
- **warn** if >100 lines — getting large, suggest a review
- **pass** if ≤100 lines

### 2. IDENTITY.md and USER.md size
- **warn** if either is >80 lines — these should be concise
- **pass** if ≤80 lines

### 3. HEARTBEAT.md stale tasks
Count completed (`- [x]`) vs pending (`- [ ]`) tasks.
- **warn** if >10 completed tasks — suggest clearing done tasks
- **warn** if any pending tasks are >7 days old (check timestamps in notes if present)
- **pass** otherwise

### 4. Daily notes accumulation
Count files in `~/.superbot/daily/`.
- **warn** if >30 files — old notes are piling up. Suggest promoting key learnings to MEMORY.md and archiving old ones.
- **pass** if ≤30 files

### 5. Observer health
Read `~/.superbot/.observer-offset` (JSON with `session_id` and `line`).
- **warn** if file doesn't exist — observer may not have run yet
- **warn** if `session_id` points to a file that no longer exists — stale offset
- **pass** if offset file exists and points to a valid session

## Output format

First show the `doctor.sh` output, then the content checks:

```
Content Checks
──────────────
 pass  MEMORY.md           47 lines
 pass  Identity/User       Within size limits
 warn  Heartbeat           14 completed tasks — suggest clearing
 pass  Daily notes         12 files
 pass  Observer            Tracking session abc123, line 847

1 warning, 0 failures
```

## Fixing

After reporting, if there are any warn or fail items, ask:
> "Want me to fix these? I can [list specific fixable things]."

Fixable things (do these if the user says yes):
- Create missing files from templates
- Clear completed heartbeat tasks (remove `- [x]` lines)
- Delete stale `.observer-offset`

Things you should NOT auto-fix (just advise):
- Pruning MEMORY.md — needs human judgment about what to keep
- Deleting old daily notes — suggest archiving instead
- Installing launchd — point to the script
- Config issues — point to setup
