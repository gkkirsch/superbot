# Project: {{NAME}}

> {{DESCRIPTION}}

## File Structure

```
projects/{{SLUG}}/
├── README.md           ← you are here — project overview and file guide
├── PLAN.md             ← goals, milestones, current phase, decisions log
├── project.json        ← metadata, status, codeDir, links
├── tasks/              ← task backlog (JSON files, one per task)
│   └── .highwatermark  ← next task ID counter
└── docs/               ← all project documentation, organized by topic
    ├── <topic>.md      ← one file per topic (architecture, auth, api, etc.)
    ├── plans/          ← implementation plans
    │   └── YYYY-MM-DD-feature-name.md
    ├── research/       ← investigation findings
    │   └── YYYY-MM-DD-topic.md
    └── design/         ← design specs and decisions
        └── YYYY-MM-DD-feature-design.md
```

## Where to Put Things

### PLAN.md
The project's north star. Always keep it current.
- Goals and what success looks like
- Current phase (planning / building / testing / deployed / maintenance)
- Milestones with checkboxes
- Next steps — what should be worked on now
- Decisions log — date, decision, rationale

### docs/ — One File Per Topic
This is where the real knowledge lives. **Name files by topic, not by date.**

Examples:
- `docs/architecture.md` — how the system is built, key components, data flow
- `docs/auth.md` — how authentication works, tokens, sessions
- `docs/api.md` — endpoints, request/response formats
- `docs/deployment.md` — how to deploy, environments, CI/CD
- `docs/known-issues.md` — bugs, tech debt, gotchas

For time-specific artifacts, use the subdirectories:
- `docs/plans/2026-02-09-user-auth.md` — implementation plan for a feature
- `docs/research/2026-02-09-oauth-providers.md` — investigation findings
- `docs/design/2026-02-09-notification-system.md` — design spec

### tasks/
JSON files, one per task. Workers pick up pending tasks by priority.

### project.json
Metadata. Workers read this to find the code directory, status, and links.

## How Workers Use This

When a project worker starts, it reads files in this order:
1. **README.md** (this file) — understand the project structure
2. **PLAN.md** — understand goals and current state
3. **project.json** — find the code directory
4. **tasks/** — find pending work
5. **docs/** — read topic files relevant to the current task

Workers write back to these files as they work — updating PLAN.md, creating docs, completing tasks.
