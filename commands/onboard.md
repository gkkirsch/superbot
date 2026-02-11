---
description: Walk through superbot onboarding to configure identity and preferences
allowed-tools: Bash, Read, Write, Edit
---

Onboard the user into superbot — configure identity, preferences, and skills.

## Behavior

### Step 1: Check Prerequisites

Check if `~/.superbot/ONBOARD.md` exists. If it does NOT, the setup script hasn't been run yet. Tell the user:

> "It looks like the setup script hasn't been run yet. Exit and run the setup script first:"
> ```
> bash <path-to-superbot>/scripts/setup.sh
> ```
> (Replace `<path-to-superbot>` with wherever the superbot repo is cloned — e.g., `~/.superbot-plugin`)

Then stop. Do not continue with onboarding.

If `~/.superbot/.setup-complete` exists, setup AND onboarding have already been completed. Tell the user "Superbot is already set up!" Show a brief status: identity name from IDENTITY.md and user name from USER.md. Ask if they'd like to re-run onboarding. If yes, delete `~/.superbot/.setup-complete` and continue. If no, stop here.

### Step 2: Onboarding

Read `~/.superbot/ONBOARD.md` for the onboarding guide. Then:

1. Read `~/.superbot/IDENTITY.md` and `~/.superbot/USER.md` first — if they already have real content, use it as context and skip questions that are already answered
2. Walk through each section **one at a time**, asking the user questions conversationally
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

### Step 3: Enable Background Services

Install both the heartbeat and scheduler background tasks:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-heartbeat.sh
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-scheduler.sh
```

No need to ask — just do it and inform the user they're active.

### Step 4: Populate Heartbeat Proactively

Based on everything you learned during onboarding, **immediately populate HEARTBEAT.md**. Don't ask — just do it.

1. **Add recurring checks** for the user's spaces, interests, and common tasks. These are things you should monitor every heartbeat cycle:
   - Their active spaces (check for stale tasks, progress)
   - Their interests (scan for news, content opportunities)
   - Any monitoring they'd benefit from (engagement, deadlines)

2. **Add work items** for obvious follow-up from onboarding:
   - Create spaces for initiatives they mentioned
   - Research things they referenced but didn't have details on
   - Draft first steps for goals they expressed

3. **Create spaces** for anything substantial they mentioned wanting to build, research, or accomplish. Use `create-space.sh`.

The user just told you everything about their life and goals. If you don't act on it immediately, you failed the onboarding. This is the difference between a reactive assistant and a proactive one.

### Step 5: Cleanup

Once everything is confirmed:
- **Create** the setup-complete marker: `touch ~/.superbot/.setup-complete`
- **Delete** `~/.superbot/ONBOARD.md` using Bash (`rm`)
- Show a final summary of everything that was set up, including the heartbeat items and spaces you created
- **Restart** to load the new identity, user profile, and any installed skills:
  ```bash
  touch ~/.superbot/.restart
  ```
