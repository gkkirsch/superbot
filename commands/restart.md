---
description: Restart superbot with fresh context — resumes session, re-reads all files
allowed-tools: Bash
---

Resume the current session with freshly assembled context and reloaded capabilities.

## Behavior

Restart:

```bash
touch ~/.superbot/.restart
```

### Examples

Restart after installing a skill:
```bash
touch ~/.superbot/.restart
```

Restart from a Slack conversation:
```bash
touch ~/.superbot/.restart
```

Plain restart:
```bash
touch ~/.superbot/.restart
```

## When to use

- After installing or removing skills, plugins, or marketplace packages
- After making significant changes to MEMORY.md, IDENTITY.md, or USER.md that should take effect immediately
- After the heartbeat worker has processed tasks and you want to pick up the results
- When the user asks to "restart", "reload", "refresh context", or "start fresh"

## Important

- This uses `--resume` to continue the same session with freshly assembled context. The conversation history is preserved — you pick up right where you left off, but with reloaded system prompt, skills, and context files.
- Session activity is automatically captured by the daily observer — no manual summary needed.
- All background daemons (Slack bot, heartbeat, scheduler) are also restarted to pick up code changes.
- The restart happens automatically — no user action needed after the flag is written.
