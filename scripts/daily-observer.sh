#!/bin/bash
# Daily observer — parses the most recent session and appends key events to today's daily notes.
# Called by heartbeat-cron.sh every 30 minutes.
set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.superbot"
DAILY_DIR="$DIR/daily"
OFFSET_FILE="$DIR/.observer-offset"
TODAY="$(date '+%Y-%m-%d')"
TODAY_FILE="$DAILY_DIR/$TODAY.md"
CONFIG="$HOME/.superbot/config.json"

# Read observer model from config (default: haiku)
OBSERVER_MODEL="haiku"
if [[ -f "$CONFIG" ]]; then
  MODEL_FROM_CONFIG=$(jq -r '.observer.model // "haiku"' "$CONFIG" 2>/dev/null)
  [[ -n "$MODEL_FROM_CONFIG" && "$MODEL_FROM_CONFIG" != "null" ]] && OBSERVER_MODEL="$MODEL_FROM_CONFIG"
fi

mkdir -p "$DAILY_DIR"

# Find the most recently modified .jsonl across all project dirs
LATEST_JSONL=""
LATEST_MTIME=0

for projdir in "$HOME/.claude/projects"/*/; do
  [[ -d "$projdir" ]] || continue
  for f in "$projdir"*.jsonl; do
    [[ -f "$f" ]] || continue
    # Get modification time as epoch seconds (macOS stat)
    MTIME=$(stat -f '%m' "$f" 2>/dev/null || stat -c '%Y' "$f" 2>/dev/null || echo 0)
    if [[ "$MTIME" -gt "$LATEST_MTIME" ]]; then
      LATEST_MTIME="$MTIME"
      LATEST_JSONL="$f"
    fi
  done
done

if [[ -z "$LATEST_JSONL" ]]; then
  exit 0
fi

SESSION_ID=$(basename "$LATEST_JSONL" .jsonl)

# Read stored offset
STORED_SESSION=""
STORED_LINE=1
if [[ -f "$OFFSET_FILE" ]]; then
  STORED_SESSION=$(jq -r '.session_id // ""' "$OFFSET_FILE" 2>/dev/null)
  STORED_LINE=$(jq -r '.line // 1' "$OFFSET_FILE" 2>/dev/null)
fi

# If session changed, reset offset
if [[ "$SESSION_ID" != "$STORED_SESSION" ]]; then
  STORED_LINE=1
fi

# Count total lines in the file
TOTAL_LINES=$(wc -l < "$LATEST_JSONL" | tr -d ' ')

# If no new lines since last check, exit
if [[ "$STORED_LINE" -gt "$TOTAL_LINES" ]]; then
  exit 0
fi

# Parse new lines from the session
PARSED=$("$PLUGIN_ROOT/scripts/parse-session.sh" "$LATEST_JSONL" "$STORED_LINE")

# If no conversational content extracted, update offset and exit
if [[ -z "$PARSED" ]]; then
  echo "{\"session_id\": \"$SESSION_ID\", \"line\": $((TOTAL_LINES + 1))}" > "$OFFSET_FILE"
  exit 0
fi

# Read existing daily notes
EXISTING_NOTES=""
if [[ -f "$TODAY_FILE" ]]; then
  EXISTING_NOTES=$(cat "$TODAY_FILE")
fi

# Build the prompt for the observer
OBSERVER_SYSTEM=$(cat "$PLUGIN_ROOT/scripts/observer-prompt.md")

OBSERVER_INPUT="## Existing Daily Notes

${EXISTING_NOTES:-No notes yet today.}

## Recent Session Conversation

$PARSED"

# Call Claude with Haiku to extract key events
RESULT=$(claude -p "$OBSERVER_INPUT" \
  --system-prompt "$OBSERVER_SYSTEM" \
  --model "$OBSERVER_MODEL" \
  --dangerously-skip-permissions \
  2>/dev/null)

# Update offset regardless of result
echo "{\"session_id\": \"$SESSION_ID\", \"line\": $((TOTAL_LINES + 1))}" > "$OFFSET_FILE"

# If nothing new, exit (check contains rather than exact match — LLMs add reasoning)
if [[ -z "$RESULT" ]] || echo "$RESULT" | grep -qi "NOTHING_NEW"; then
  exit 0
fi

# Strip markdown code block wrappers if present
RESULT=$(echo "$RESULT" | sed '/^```$/d' | sed '/^```markdown$/d')

# Extract only lines that look like daily note entries (- HH:MM or - ~HH:MM)
CLEAN_RESULT=$(echo "$RESULT" | grep '^- ' || true)

if [[ -z "$CLEAN_RESULT" ]]; then
  exit 0
fi

# Append to today's daily notes
if [[ ! -f "$TODAY_FILE" ]]; then
  echo "# Daily Notes — $TODAY" > "$TODAY_FILE"
  echo "" >> "$TODAY_FILE"
fi

echo "$CLEAN_RESULT" >> "$TODAY_FILE"
