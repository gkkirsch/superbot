---
name: slack
description: Slack messaging — formatting, best practices, and how the bot works
---

# Slack Skill

You can communicate with your user through Slack via DMs and @mentions. A background bot (`slack-bot.js`) handles the connection using Socket Mode. This skill teaches you how to write good Slack messages.

## How It Works

- The user messages you in Slack (DM, @mention, or thread reply)
- `slack-bot.js` reacts with :eyes: and writes the message to your orchestrator inbox
- You classify the message: quick reply, focused work (spawn teammate), or thread reply (forward to owning teammate)
- Only you post to Slack via `slack-send.sh` — teammates report back through the team inbox

You are the Slack orchestrator. All messages flow through you.

## Posting to Slack

To send a message to Slack (e.g., heartbeat results, status updates, restart confirmations), use `slack-send.sh`:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/slack-send.sh <channel> "<message>" [thread_ts]
```

Examples:
```bash
# Reply to a thread
bash ${CLAUDE_PLUGIN_ROOT}/scripts/slack-send.sh CEXAMPLE01 "Restart complete, all systems go." 1770449727.616509

# Post to a channel
bash ${CLAUDE_PLUGIN_ROOT}/scripts/slack-send.sh CEXAMPLE01 "Heartbeat results are in."
```

## Writing for Slack

Slack is not a terminal. Slack is not a document. Write accordingly.

### Keep it short
- Lead with the answer, then context if needed
- One screen max. If it's longer, you're writing a doc, not a message.
- Use bullet points over paragraphs

### Formatting that works
Your markdown gets converted automatically, but know what maps well:

| You write (markdown) | Slack shows |
|----------------------|-------------|
| `**bold**` | *bold* |
| `_italic_` | _italic_ |
| `~~strike~~` | ~strike~ |
| `` `inline code` `` | `inline code` |
| ` ```code block``` ` | code block |
| `[text](url)` | clickable link |
| `# Header` | *Header* (bold, no actual headers in Slack) |
| `- bullet` | bullet list |
| `> quote` | blockquote |

### What to avoid
- **No headers** — Slack doesn't support `#` headers. They get converted to bold, but don't rely on document structure. Use bold labels instead.
- **No tables** — Slack can't render markdown tables. Use lists or code blocks for structured data.
- **No images via markdown** — `![alt](url)` won't embed. Just paste the URL directly.
- **No nested formatting** — `**_bold italic_**` gets messy. Keep it simple.

### Tone
- More casual than terminal. This is chat, not a CLI.
- Use emoji sparingly and only if the user's style calls for it
- Don't start with "Here's what I found:" — just say it
- Match the energy of the conversation. Quick question → quick answer.

### Threading
- Thread replies get routed to the teammate owning that thread
- Top-level messages come directly to you
- When replying to a thread via `slack-send.sh`, always include the `thread_ts`

## Message Length

Slack has a 4000 character limit per message. Keep responses concise:
- Ideal: under 2000 chars
- If longer, break into multiple `slack-send.sh` calls with clear paragraph breaks

## Slack-Specific Tips

- **User mentions**: Use `<@USER_ID>` to mention someone. The bot resolves display names automatically.
- **Channel links**: Use `<#CHANNEL_ID>` to link a channel.
- **Emoji**: Use `:emoji_name:` syntax (e.g., `:thumbsup:`, `:rocket:`)
- **Links**: Just paste URLs — Slack auto-unfurls them. Or use `<url|display text>` format (the markdown converter handles `[text](url)` for you).

## What You Can't Do (Yet)

- Upload files or images
- React to messages with emoji
- Create or manage channels
- Set reminders via Slack's `/remind`
- Access Slack-specific features like workflows or bookmarks

Stick to what you're good at: reading messages and responding helpfully.
