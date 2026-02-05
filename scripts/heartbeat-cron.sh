#!/bin/bash
export PATH="$HOME/.local/bin:$HOME/.asdf/shims:$HOME/.asdf/bin:$PATH"
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.superbot"
TEAM_DIR="$HOME/.claude/teams/superbot"
CONFIG="$HOME/.superbot/config.json"

# Read heartbeat model from config (default: opus)
HEARTBEAT_MODEL="opus"
if [[ -f "$CONFIG" ]]; then
  MODEL_FROM_CONFIG=$(jq -r '.heartbeat.model // .defaultModel // "opus"' "$CONFIG")
  [[ -n "$MODEL_FROM_CONFIG" && "$MODEL_FROM_CONFIG" != "null" ]] && HEARTBEAT_MODEL="$MODEL_FROM_CONFIG"
fi

# Ensure log directory exists
mkdir -p "$DIR/logs"

# Guard: skip if team not set up yet
if [[ ! -f "$TEAM_DIR/config.json" ]]; then
  echo "$(date '+%Y-%m-%d %H:%M') - Skipped: team not set up yet" >> "$DIR/logs/heartbeat.log"
  exit 0
fi

# Guard: skip if no teammate prompt
if [[ ! -f "$DIR/prompts/heartbeat.md" ]]; then
  echo "$(date '+%Y-%m-%d %H:%M') - Skipped: no prompts/heartbeat.md" >> "$DIR/logs/heartbeat.log"
  exit 0
fi

# Run daily observer (parses recent session, appends to daily notes)
"$PLUGIN_ROOT/scripts/daily-observer.sh" 2>> "$DIR/logs/heartbeat.log"

# Run triage check
if "$PLUGIN_ROOT/scripts/triage.sh"; then
  echo "$(date '+%Y-%m-%d %H:%M') - Triage: work needed, spawning teammate" >> "$DIR/logs/heartbeat.log"

  # Read lead session ID from team config
  LEAD_SESSION=$(jq -r '.leadSessionId' "$TEAM_DIR/config.json")

  # Build system prompt from all context files (live at spawn time)
  SYSTEM_PROMPT="$(cat "$DIR/prompts/heartbeat.md")

---
## IDENTITY
$(cat "$DIR/IDENTITY.md" 2>/dev/null || echo "No identity file found.")

---
## USER
$(cat "$DIR/USER.md" 2>/dev/null || echo "No user file found.")

---
## MEMORY
$(cat "$DIR/MEMORY.md" 2>/dev/null || echo "No memory file found.")

---
## HEARTBEAT.md
$(cat "$DIR/HEARTBEAT.md" 2>/dev/null || echo "No tasks found.")"

  # Extract just the pending (unchecked) tasks for the kickoff message
  PENDING=$(grep '^\- \[ \]' "$DIR/HEARTBEAT.md" 2>/dev/null | sed 's/^- \[ \] //' || echo "Check HEARTBEAT.md for details.")

  # Drop a message in the heartbeat worker's inbox before spawning it
  INBOX="$TEAM_DIR/inboxes/heartbeat.json"
  KICKOFF_MSG=$(jq -n \
    --arg from "superbot" \
    --arg text "Hey heartbeat — I've got work for you. Here are the pending tasks:\n\n$PENDING\n\nIf you need any additional context before starting, message me and ask. Otherwise, go ahead and get to work." \
    --arg summary "New tasks ready — ask superbot for context if needed" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{from: $from, text: $text, summary: $summary, timestamp: $ts, read: false}')
  # Append to existing inbox array (or create one)
  if [[ -f "$INBOX" ]] && jq -e '. | type == "array"' "$INBOX" >/dev/null 2>&1; then
    jq --argjson msg "$KICKOFF_MSG" '. + [$msg]' "$INBOX" > "$INBOX.tmp" && mv "$INBOX.tmp" "$INBOX"
  else
    echo "[$KICKOFF_MSG]" > "$INBOX"
  fi

  # Spawn teammate with assembled system prompt (all context baked in)
  claude -p "Process the pending tasks in HEARTBEAT.md. Check your inbox first." \
    --system-prompt "$SYSTEM_PROMPT" \
    --model "$HEARTBEAT_MODEL" \
    --team-name superbot \
    --agent-name heartbeat \
    --agent-id heartbeat@superbot \
    --dangerously-skip-permissions \
    2>> "$DIR/logs/heartbeat-stderr.log"

  echo "$(date '+%Y-%m-%d %H:%M') - Teammate completed" >> "$DIR/logs/heartbeat.log"
else
  echo "$(date '+%Y-%m-%d %H:%M') - Triage: nothing to do" >> "$DIR/logs/heartbeat.log"
fi
