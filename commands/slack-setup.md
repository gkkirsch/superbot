---
description: Set up the Superbot Slack bot integration
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion
---

Set up the Slack bot so users can talk to superbot via Slack DMs and @mentions.

## Behavior

### Step 1: Check Prerequisites

1. Verify `~/.superbot/` exists (superbot must be set up first). If not, tell the user to run `/setup` first.
2. Verify `node` is available on PATH.
3. Check if `~/.superbot/config.json` has Slack tokens already set (`.slack.botToken` is non-empty) — if so, ask if they want to reconfigure or just reinstall the daemon.

### Step 2: Create the Slack App

First, copy the manifest to the clipboard and open the Slack API page:

```bash
cat ${CLAUDE_PLUGIN_ROOT}/scripts/slack-manifest.json | pbcopy
```

```bash
open https://api.slack.com/apps
```

Then tell the user:

> The app manifest has been copied to your clipboard and I've opened the Slack API page in your browser.
>
> 1. Click **Create New App** → **From a manifest**
> 2. Select your workspace
> 3. Switch to **JSON** tab
> 4. **Paste** (the manifest is already on your clipboard) and click **Create**

If the user says `pbcopy` didn't work or they need the manifest another way, offer to open it in a text viewer:

```bash
open ${CLAUDE_PLUGIN_ROOT}/scripts/slack-manifest.json
```

After creating the app, tell them:

> Now enable Socket Mode and get your tokens:
>
> 1. In the app settings, go to **Socket Mode** (left sidebar) and make sure it's enabled
> 2. Go to **Basic Information** → **App-Level Tokens** → **Generate Token**
>    - Name it `superbot-socket`, add scope `connections:write`, click **Generate**
>    - Copy the token (starts with `xapp-`)
> 3. Go to **OAuth & Permissions** (left sidebar) → **Install to Workspace** → **Allow**
> 4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Step 3: Collect Tokens

Use AskUserQuestion to ask for both tokens:

1. Ask for the **App-Level Token** (xapp-...)
2. Ask for the **Bot User OAuth Token** (xoxb-...)

Validate that the app token starts with `xapp-` and the bot token starts with `xoxb-`.

### Step 4: Save Config

Update the Slack section in `~/.superbot/config.json`:

Read the existing config, update the `slack` object, and write it back:

```bash
jq --arg bot "xoxb-..." --arg app "xapp-..." '.slack.botToken = $bot | .slack.appToken = $app' ~/.superbot/config.json > /tmp/superbot-config.tmp && mv /tmp/superbot-config.tmp ~/.superbot/config.json
```

Then set permissions: `chmod 600 ~/.superbot/config.json`

### Step 5: Install Dependencies

Run `npm install` in `${CLAUDE_PLUGIN_ROOT}`.

### Step 6: Test the Bot

Before installing the daemon, do a quick test run:

```bash
timeout 10 node ${CLAUDE_PLUGIN_ROOT}/scripts/slack-bot.js 2>&1 || true
```

If it shows "Slack bot is running" in the output, it's working. If there are auth errors, help the user troubleshoot.

### Step 7: Install the Daemon

Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-slack.sh` to install the launchd daemon.

### Step 8: Final Instructions

Tell the user:

> Your Slack bot is live. Try:
> - **DM the bot** in Slack for a direct conversation
> - **@mention it** in a channel for threaded replies
>
> The bot runs as a background daemon and restarts automatically.
>
> **Useful commands:**
> - View logs: `tail -f ~/.superbot/logs/slack-stdout.log`
> - Restart: `launchctl unload ~/Library/LaunchAgents/com.claude.superbot-slack.plist && launchctl load ~/Library/LaunchAgents/com.claude.superbot-slack.plist`
> - Stop: `bash ${CLAUDE_PLUGIN_ROOT}/scripts/uninstall-slack.sh`
