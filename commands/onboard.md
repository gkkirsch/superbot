---
description: Walk through superbot onboarding to configure identity and preferences
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion
---

Onboard the user into superbot — configure identity, preferences, and skills.

## Behavior

### Step 1: Check Prerequisites

Check if `~/.superbot/ONBOARD.md` exists. If it does NOT, the setup script hasn't been run yet. Tell the user:

> "It looks like the setup script hasn't been run yet. Exit and run the setup script first:"
> ```
> bash <path-to-superbot>/scripts/setup.sh
> ```
> (Replace `<path-to-superbot>` with wherever the superbot repo is cloned — e.g., `~/dev/superbot`)

Then stop. Do not continue with onboarding.

If `~/.superbot/.setup-complete` exists, setup AND onboarding have already been completed. Tell the user "Superbot is already set up!" Show a brief status: identity name from IDENTITY.md and user name from USER.md. Ask if they'd like to re-run onboarding. If yes, delete `~/.superbot/.setup-complete` and continue. If no, stop here.

### Step 2: Onboarding

Read `~/.superbot/ONBOARD.md` for the onboarding guide. Then:

1. Read `~/.superbot/IDENTITY.md` and `~/.superbot/USER.md` first — if they already have real content, use it as context and skip questions that are already answered
2. Walk through each section **one at a time**, asking the user questions conversationally using AskUserQuestion or natural conversation
3. Don't ask all questions at once — have a back-and-forth dialogue, one section at a time
4. After each section, write the user's answers into the appropriate file:
   - User info and preferences go into `~/.superbot/USER.md`
   - Bot personality and identity go into `~/.superbot/IDENTITY.md`
5. Core skills (superbot, slack, gog) are already installed by the setup script. The onboarding guide includes an optional skills selection step — for each skill the user selects, install it using:
   ```
   npx skills add <owner/repo@skill> -g -a claude-code -y
   ```
   To search for skills not in the curated list, use the skills registry API:
   ```
   https://skills.sh/api/search?q=<query>&limit=50
   ```

### Step 3: Enable Heartbeat

Install the heartbeat background task:

```
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-launchd.sh
```

No need to ask — just do it and inform the user it's active.

### Step 4: Cleanup

Once everything is confirmed:
- **Create** the setup-complete marker: `touch ~/.superbot/.setup-complete`
- **Delete** `~/.superbot/ONBOARD.md` using Bash (`rm`)
- Show a final summary of everything that was set up
- **Restart** to load the new identity, user profile, and any installed skills:
  ```bash
  touch ~/.superbot/.restart
  ```
