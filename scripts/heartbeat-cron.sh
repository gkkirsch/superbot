#!/bin/bash
export PATH="$HOME/.local/bin:$HOME/.asdf/shims:$HOME/.asdf/bin:$PATH"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.superbot"
TEAM_DIR="$HOME/.claude/teams/superbot"

# Ensure log directory exists
mkdir -p "$DIR/logs"

# Guard: skip if team not set up yet
if [[ ! -f "$TEAM_DIR/config.json" ]]; then
  echo "$(date '+%Y-%m-%d %H:%M') - Skipped: team not set up yet" >> "$DIR/logs/heartbeat.log"
  exit 0
fi

# Run daily observer (parses recent session, appends to daily notes)
"$PLUGIN_ROOT/scripts/daily-observer.sh" 2>> "$DIR/logs/heartbeat.log"

# Run triage check (haiku — quick YES/NO on whether there are actionable items)
if "$PLUGIN_ROOT/scripts/triage.sh"; then
  echo "$(date '+%Y-%m-%d %H:%M') - Triage: work needed, notifying superbot" >> "$DIR/logs/heartbeat.log"

  # Extract pending (unchecked) tasks
  PENDING=$(grep '^\- \[ \]' "$DIR/HEARTBEAT.md" 2>/dev/null | sed 's/^- \[ \] //' || echo "Check HEARTBEAT.md for details.")

  # Drop a notification in superbot's inbox
  INBOX="$TEAM_DIR/inboxes/superbot.json"
  MSG=$(jq -n \
    --arg from "heartbeat" \
    --arg text "You have pending heartbeat items that need attention:\n\n$PENDING\n\nCheck HEARTBEAT.md, work through them, and mark each one done (\`[x]\`) when complete." \
    --arg summary "Pending heartbeat items need attention" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{from: $from, text: $text, summary: $summary, timestamp: $ts, read: false}')

  if [[ -f "$INBOX" ]] && jq -e '. | type == "array"' "$INBOX" >/dev/null 2>&1; then
    jq --argjson msg "$MSG" '. + [$msg]' "$INBOX" > "$INBOX.tmp" && mv "$INBOX.tmp" "$INBOX"
  else
    echo "[$MSG]" > "$INBOX"
  fi

  echo "$(date '+%Y-%m-%d %H:%M') - Notification sent to superbot inbox" >> "$DIR/logs/heartbeat.log"
else
  echo "$(date '+%Y-%m-%d %H:%M') - Triage: nothing to do" >> "$DIR/logs/heartbeat.log"
fi
