---
name: superbot
description: Manage superbot context - memory, identity, user profile
---

# Superbot Context Manager

Manage context files in ~/.superbot/

## Files
- MEMORY.md - Persistent notes and learnings
- IDENTITY.md - Your persona and behavior guidelines
- USER.md - Information about the user
- HEARTBEAT.md - Background task queue
- daily/YYYY-MM-DD.md - Daily notes — auto-populated by observer + heartbeat + manual

## Commands
- "remember [thing]" - Add to MEMORY.md
- "forget [thing]" - Remove from MEMORY.md
- "identity" - Show/edit IDENTITY.md
- "user" - Show/edit USER.md
- "status" - Overview of all files and last heartbeat

When user says "/superbot [something]", interpret their intent. For memory operations, append don't overwrite. Keep files concise.
