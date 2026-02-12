# Onboarding

Walk through each section with the user conversationally. Use their answers to populate IDENTITY.md and USER.md, then delete this file.

## Before You Start

Read `~/.superbot/IDENTITY.md` and `~/.superbot/USER.md` first. If they already have real content, use it as context — skip what's already answered.

## 0. Pre-flight Checks

Run silently before starting. If anything fails, tell the user.

- Run `claude --version` and compare against `npm show @anthropic-ai/claude-code version`. If behind, tell them to run `claude update` and don't proceed until current.
- Check `echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. If not `1`, add `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to their shell profile and tell them to source it.

## Important

Write to files using a subagent so we don't pollute the main thread.

## 1. Introductions

Ask their name. Then ask them to give you a name. Write your name into IDENTITY.md.

## 2. About the User

Ask one question: What do you spend the most time doing? What are you passionate about? What do you wish you could learn?

Follow up with one more question based on their answer.

Write answers into USER.md.

## 3. Common Tasks

Ask what things they do daily that they wish someone else could handle. Big or small.

Write answers into USER.md under `## Common Tasks`.

## 4. What You Can Do

Based on what you learned, give 2-3 **specific, personalized** examples of things you can help with. Tailor to their actual life — not generic suggestions.

## 5. Act on What You Learned

This is the most important step. Don't just set up the system — **use it**.

1. **Create spaces** for anything substantial the user mentioned
2. **Populate HEARTBEAT.md** with recurring checks and work items based on their goals
3. **Schedule a test check-in** 1 minute from now so they see the scheduler work:
   ```bash
   TEST_TIME=$(date -v+1M '+%H:%M')
   jq --arg time "$TEST_TIME" '.schedule += [{"name": "first-checkin", "time": $time, "task": "Check in with the user. Read ~/.superbot/USER.md and ~/.superbot/IDENTITY.md for context. Write a brief, friendly message in their daily notes saying hi and confirming everything is working."}]' ~/.superbot/config.json > /tmp/superbot-config.tmp && mv /tmp/superbot-config.tmp ~/.superbot/config.json
   ```
4. **Schedule a skills walkthrough** 10 minutes from now:
   ```bash
   SKILLS_TIME=$(date -v+10M '+%H:%M')
   jq --arg time "$SKILLS_TIME" '.schedule += [{"name": "skills-intro", "time": $time, "task": "Walk the user through skills. Show them how to search for skills (GET https://skills.sh/api/search?q=<query>&limit=50), how to install them (npx skills add <owner/repo@skill> -g -a claude-code -y), and help them pick a few that match their interests. Google Workspace and Slack are already installed. Mention /superbot:slack-setup to connect Slack."}]' ~/.superbot/config.json > /tmp/superbot-config.tmp && mv /tmp/superbot-config.tmp ~/.superbot/config.json
   ```

If you finish onboarding without creating spaces or heartbeat items from what the user told you, you failed.

## 7. Wrap Up

- Install background services:
  ```bash
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-heartbeat.sh
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-scheduler.sh
  ```
- Briefly tell the user: you have a background heartbeat that checks for pending work every 30 min, a scheduler for timed tasks, and persistent memory across sessions. That's it — don't over-explain.
- Write final notes into IDENTITY.md or USER.md
- `touch ~/.superbot/.setup-complete`
- Delete this file (`rm ~/.superbot/ONBOARD.md`)
- Show a summary of everything set up
- Restart: `touch ~/.superbot/.restart`
