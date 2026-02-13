#!/bin/bash
# Load node path resolved at install time (works across all node managers)
[[ -f "$HOME/.superbot/.node-path" ]] && export PATH="$(cat "$HOME/.superbot/.node-path"):$PATH"
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

# Clean up stale worker sessions (active but no running process)
"$PLUGIN_ROOT/scripts/worker-status.sh" --fix >> "$DIR/logs/heartbeat.log" 2>&1

# Run daily observer (parses recent session, appends to daily notes)
"$PLUGIN_ROOT/scripts/daily-observer.sh" 2>> "$DIR/logs/heartbeat.log"

# Run triage check (haiku — quick YES/NO on whether there are actionable items)
if "$PLUGIN_ROOT/scripts/triage.sh"; then
  echo "$(date '+%Y-%m-%d %H:%M') - Triage: work needed, notifying superbot" >> "$DIR/logs/heartbeat.log"

  # Current time for time awareness
  CURRENT_TIME="$(date '+%A %B %-d, %-I:%M %p')"

  # Extract pending (unchecked) work items
  PENDING=$(grep '^\- \[ \]' "$DIR/HEARTBEAT.md" 2>/dev/null | sed 's/^- \[ \] //' || true)

  # Extract recurring checks
  RECURRING=$(sed -n '/^## Recurring Checks/,/^## /{ /^- /p; }' "$DIR/HEARTBEAT.md" 2>/dev/null || true)

  # Build message
  BODY="Current time: $CURRENT_TIME\n\n"
  if [[ -n "$RECURRING" ]]; then
    BODY+="Recurring checks:\n$RECURRING\n\n"
  fi
  if [[ -n "$PENDING" ]]; then
    BODY+="Pending work items:\n$PENDING\n\n"
  fi
  BODY+="Check HEARTBEAT.md, work through them, and mark work items done (\`[x]\`) when complete."

  # Drop a notification in team-lead's inbox
  INBOX="$TEAM_DIR/inboxes/team-lead.json"
  MSG=$(jq -n \
    --arg from "heartbeat" \
    --arg text "$BODY" \
    --arg summary "Heartbeat: $CURRENT_TIME" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{from: $from, text: $text, summary: $summary, timestamp: $ts, read: false}')

  if [[ -f "$INBOX" ]] && jq -e '. | type == "array"' "$INBOX" >/dev/null 2>&1; then
    jq --argjson msg "$MSG" '. + [$msg]' "$INBOX" > "$INBOX.tmp" && mv "$INBOX.tmp" "$INBOX"
  else
    echo "[$MSG]" > "$INBOX"
  fi

  echo "$(date '+%Y-%m-%d %H:%M') - Notification sent to team-lead inbox" >> "$DIR/logs/heartbeat.log"
else
  echo "$(date '+%Y-%m-%d %H:%M') - Triage: nothing to do" >> "$DIR/logs/heartbeat.log"
fi
