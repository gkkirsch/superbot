---
description: Browse, install, and manage skills, plugins, and marketplaces
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch
---

Browse and manage extensions. There are **two separate systems** — know which is which.

## Terminology

Users say "plugins", "skills", "extensions", "add-ons", "integrations", "marketplace", "store", "registry" interchangeably. Don't correct them — just figure out what they need:

- **Searching for new capabilities** → search skills.sh registry first, then check plugins
- **"Is there a plugin/skill/extension for X?"** → search both systems
- **"Marketplace" or "store"** → could mean skills.sh registry OR plugin marketplaces — check both
- **"Install a plugin"** → could mean either system — ask or infer from context

When someone asks to "find a plugin for Notion" or "search the marketplace for email tools", treat it as a search across both systems. Don't say "actually those are called skills" — just help them.

## Two Extension Systems

### Skills (`npx skills`)
Community skill files — markdown documents that teach Claude new capabilities. Managed by the `skills` CLI. Come from the `skills.sh` registry or GitHub repos.

- Installed to: `~/.agents/skills/<name>/` (global), symlinked to `~/.claude/skills/<name>/`
- Registry API: `GET https://skills.sh/api/search?q=<query>&limit=50`

### Plugins (`claude plugin`)
First-party plugin system built into Claude Code. Plugins are code packages from **marketplaces** that add tools, hooks, and slash commands.

- Installed to: `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`
- Registry: `~/.claude/plugins/installed_plugins.json`
- Plugin names include marketplace: `pro-design@supercharge-claude-code`

**Both require a restart after changes:**
```bash
touch ~/.superbot/.restart
```

---

## Behavior

Parse the user's argument to determine the action:

- `/skills` or `/skills list` → **List everything**
- `/skills install <name>` → **Install a skill**
- `/skills remove <name>` → **Remove a skill**
- `/skills search <query>` → **Search the skills registry**
- `/skills plugins` → **List/manage plugins**
- `/skills marketplace` → **Manage marketplaces**

---

### List Everything

Show three sections:

**1. Superbot Built-in Skills**

Read all directories in `${CLAUDE_PLUGIN_ROOT}/skills/`. For each, read its `SKILL.md` and extract the `name` and `description` from the frontmatter. Check if installed by looking for a matching directory in `~/.claude/skills/`.

```
| Skill | Description | Status |
|-------|-------------|--------|
| superbot | Manage superbot context | Installed |
| gog | Google Workspace CLI | Not installed |
```

**2. Installed Skills (all sources)**

Run `npx skills list -g` to show everything currently installed globally, including skills from the registry.

**3. Installed Plugins**

Run `claude plugin list` to show all installed plugins from marketplaces.

---

### Install a Skill

**If the skill exists in `${CLAUDE_PLUGIN_ROOT}/skills/<name>/`:**

Copy it to `~/.claude/skills/<name>/`:

```bash
cp -r ${CLAUDE_PLUGIN_ROOT}/skills/<name> ~/.claude/skills/<name>
```

Then check the `SKILL.md` for any metadata about required binaries or setup steps. If there are prerequisites (like `gog` needing `brew install`), walk the user through them.

**If the skill is NOT in the superbot catalog:**

Search the skills registry API:

```
GET https://skills.sh/api/search?q=<name>&limit=10
```

Use WebFetch. Show the top results and let the user pick. Install with:

```bash
npx skills add <owner/repo@skill> -g -a claude-code -y
```

**After any install, restart to load the new skill:**

```bash
touch ~/.superbot/.restart
```

Tell the user what was installed and that you're restarting to load it. Don't ask — just do it.

---

### Remove a Skill

Remove the skill directory from `~/.claude/skills/`:

```bash
rm -rf ~/.claude/skills/<name>
```

Ask for confirmation first. If it's a symlink (registry skill), also clean up `~/.agents/skills/<name>` if it exists.

**After removal, restart to unload the skill:**

```bash
touch ~/.superbot/.restart
```

---

### Search the Registry

Query the skills API:

```
GET https://skills.sh/api/search?q=<query>&limit=20
```

Use WebFetch. Display results as a table:

```
| Name | Source | Installs |
|------|--------|----------|
| gog | steipete/clawdis | 29 |
```

Ask the user if they want to install any of the results.

---

### Plugins

Plugin operations use the `claude plugin` CLI:

| Action | Command |
|--------|---------|
| Install | `claude plugin install <name>` |
| Install from specific marketplace | `claude plugin install <name>@<marketplace>` |
| List installed | `claude plugin list` |
| Uninstall | `claude plugin uninstall <name>` |
| Enable/disable | `claude plugin enable <name>` / `claude plugin disable <name>` |
| Update | `claude plugin update <name>` |

After install/remove/update, restart:
```bash
touch ~/.superbot/.restart
```

---

### Marketplaces

Marketplaces are curated catalogs of plugins. Manage them with:

| Action | Command |
|--------|---------|
| Add a marketplace | `claude plugin marketplace add <url-or-repo>` |
| List marketplaces | `claude plugin marketplace list` |
| Update catalog | `claude plugin marketplace update` |
| Remove | `claude plugin marketplace remove <name>` |

---

## Getting Help

If you're unsure about plugin commands, check the built-in help:

```bash
claude plugin -h                    # All plugin commands
claude plugin install -h            # Install options
claude plugin marketplace -h        # Marketplace commands
```

For skills: `npx skills` (no args) shows all commands.

---

## Don't Mix Them Up

- `npx skills add` installs **skills** (markdown knowledge files)
- `claude plugin install` installs **plugins** (code packages from marketplaces)
- Don't try to `claude plugin install` a skill — it won't find it
- Don't try to `npx skills add` a plugin — different system
- When asked for "everything installed", show BOTH systems
- Plugin names with `@` (like `pro-design@supercharge-claude-code`) — the part after `@` is the marketplace, not a version
