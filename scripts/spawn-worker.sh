#!/bin/bash
# spawn-worker.sh — Spawn or resume a worker session (non-blocking)
# Usage: spawn-worker.sh <space> "<message>" [--channel <ch> --thread <ts>] [--name <name>]
#
# If a session exists for this thread: resumes it with the new message.
# If not: registers a new session.
#
# All workers run in a space context using worker-prompt.md.
# Worker runs in background. When done: drops result into team-lead's inbox.
#
# Output: <name> <session_id>

set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$HOME/.superbot/config.json"
DIR="$HOME/.superbot"
SESSIONS="$DIR/sessions.json"
INBOX="$HOME/.claude/teams/superbot/inboxes/team-lead.json"

if [[ ! -f "$CONFIG" ]]; then
  echo "Error: config.json not found. Run setup first." >&2
  exit 1
fi

# Parse args — space is first, message is second, rest are flags
SLUG="$1"; shift || true
MESSAGE="$1"; shift || true
CHANNEL=""
MESSAGE_TS=""
NAME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel) CHANNEL="$2"; shift 2 ;;
    --thread) MESSAGE_TS="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$SLUG" || -z "$MESSAGE" ]]; then
  echo "Usage: spawn-worker.sh <space> \"<message>\" [--channel <ch> --thread <ts>] [--name <name>]" >&2
  exit 1
fi

MODEL=$(jq -r '.defaultModel // "opus"' "$CONFIG")

# Resolve space
SPACE_DIR="$DIR/spaces/$SLUG"
if [[ ! -f "$SPACE_DIR/space.json" ]]; then
  echo "Error: space '$SLUG' not found." >&2
  echo "" >&2
  echo "Available spaces:" >&2
  if [[ -d "$DIR/spaces" ]]; then
    for s in "$DIR/spaces"/*/space.json; do
      [[ -f "$s" ]] || continue
      S_SLUG=$(basename "$(dirname "$s")")
      S_NAME=$(jq -r '.name // empty' "$s")
      echo "  - $S_SLUG ($S_NAME)" >&2
    done
  else
    echo "  (none)" >&2
  fi
  echo "" >&2
  echo "Create one first: bash ${PLUGIN_ROOT}/scripts/create-space.sh <slug> \"<name>\" [code-dir]" >&2
  exit 1
fi
WORK_DIR=$(jq -r '.codeDir // empty' "$SPACE_DIR/space.json")
if [[ -n "$WORK_DIR" ]]; then
  WORK_DIR="${WORK_DIR/#\~/$HOME}"
  if [[ ! -d "$WORK_DIR" ]]; then
    echo "Error: space codeDir '$WORK_DIR' does not exist" >&2
    exit 1
  fi
else
  WORK_DIR="$HOME"
fi

# Ensure sessions.json exists
if [[ ! -f "$SESSIONS" ]]; then
  echo '{"sessions":[]}' > "$SESSIONS"
fi

# Check for existing session on this thread (only if we have a thread)
EXISTING=""
if [[ -n "$MESSAGE_TS" ]]; then
  EXISTING=$(jq -r '.sessions[] | select(.slackThread.ts == "'"$MESSAGE_TS"'" and .status == "active") | .id' "$SESSIONS" 2>/dev/null | head -1)
fi

if [[ -n "$EXISTING" ]]; then
  # Resume existing session
  SESSION_ID="$EXISTING"
  NAME=$(jq -r '.sessions[] | select(.id == "'"$SESSION_ID"'") | .name' "$SESSIONS")

  (
    SESS_SPACE=$(jq -r '.sessions[] | select(.id == "'"$SESSION_ID"'") | .space // empty' "$SESSIONS")
    if [[ -n "$SESS_SPACE" ]]; then
      SESS_CODE_DIR=$(jq -r '.codeDir // empty' "$DIR/spaces/$SESS_SPACE/space.json")
      SESS_CODE_DIR="${SESS_CODE_DIR/#\~/$HOME}"
      [[ -n "$SESS_CODE_DIR" && -d "$SESS_CODE_DIR" ]] && cd "$SESS_CODE_DIR"
    fi

    OUTPUT=$(claude -p "$MESSAGE" \
      --resume "$SESSION_ID" \
      --output-format json \
      --dangerously-skip-permissions 2>&1)

    RESULT=$(echo "$OUTPUT" | jq -r '.result // empty' 2>/dev/null)

    jq --arg id "$SESSION_ID" --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '(.sessions[] | select(.id == $id)).lastActiveAt = $now' \
      "$SESSIONS" > "$SESSIONS.tmp" && mv "$SESSIONS.tmp" "$SESSIONS"

    if [[ -n "$RESULT" ]]; then
      LABEL="Space: $SLUG"
      [[ -n "$CHANNEL" ]] && LABEL+=" — Channel: $CHANNEL, thread: $MESSAGE_TS"
      jq --arg from "$NAME" \
         --arg text "[Worker result] $LABEL"$'\n\n'"$RESULT" \
         --arg summary "Worker $NAME replied" \
         --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '. += [{from: $from, text: $text, summary: $summary, timestamp: $ts, read: false}]' \
        "$INBOX" > "$INBOX.tmp" && mv "$INBOX.tmp" "$INBOX"
    fi
  ) &

else
  # New session
  SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
  NAME="${NAME:-${SLUG}-$(date +%s | tail -c 5)}"

  # Register session
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if [[ -n "$CHANNEL" && -n "$MESSAGE_TS" ]]; then
    jq --arg id "$SESSION_ID" --arg name "$NAME" \
       --arg space "$SLUG" --arg ch "$CHANNEL" --arg ts "$MESSAGE_TS" --arg now "$NOW" \
      '.sessions += [{id:$id, name:$name, type:"space", status:"active", space:$space, slackThread:{channel:$ch, ts:$ts}, createdAt:$now, lastActiveAt:$now}]' \
      "$SESSIONS" > "$SESSIONS.tmp" && mv "$SESSIONS.tmp" "$SESSIONS"
  else
    jq --arg id "$SESSION_ID" --arg name "$NAME" \
       --arg space "$SLUG" --arg now "$NOW" \
      '.sessions += [{id:$id, name:$name, type:"space", status:"active", space:$space, slackThread:null, createdAt:$now, lastActiveAt:$now}]' \
      "$SESSIONS" > "$SESSIONS.tmp" && mv "$SESSIONS.tmp" "$SESSIONS"
  fi

  # Build system prompt
  SYSTEM_PROMPT=$(sed "s|{{SPACE}}|$SLUG|g; s|{{CODE_DIR}}|$WORK_DIR|g" "$PLUGIN_ROOT/scripts/worker-prompt.md")
  if [[ -n "$CHANNEL" && -n "$MESSAGE_TS" ]]; then
    SYSTEM_PROMPT+=$'\n\n---\n\n## Slack Context\n\nChannel: '"$CHANNEL"$'\nThread: '"$MESSAGE_TS"
    SYSTEM_PROMPT+=$'\n\nWhen you respond, the orchestrator will relay your response to this Slack thread.'
  fi

  (
    [[ -n "$WORK_DIR" ]] && cd "$WORK_DIR"

    OUTPUT=$(claude -p "$MESSAGE" \
      --session-id "$SESSION_ID" \
      --system-prompt "$SYSTEM_PROMPT" \
      --model "$MODEL" \
      --output-format json \
      --dangerously-skip-permissions 2>&1)

    RESULT=$(echo "$OUTPUT" | jq -r '.result // empty' 2>/dev/null)

    jq --arg id "$SESSION_ID" --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '(.sessions[] | select(.id == $id)).lastActiveAt = $now' \
      "$SESSIONS" > "$SESSIONS.tmp" && mv "$SESSIONS.tmp" "$SESSIONS"

    if [[ -n "$RESULT" ]]; then
      LABEL="Space: $SLUG"
      [[ -n "$CHANNEL" ]] && LABEL+=" — Channel: $CHANNEL, thread: $MESSAGE_TS"
      jq --arg from "$NAME" \
         --arg text "[Worker result] $LABEL"$'\n\n'"$RESULT" \
         --arg summary "Worker $NAME finished" \
         --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '. += [{from: $from, text: $text, summary: $summary, timestamp: $ts, read: false}]' \
        "$INBOX" > "$INBOX.tmp" && mv "$INBOX.tmp" "$INBOX"
    fi
  ) &
fi

echo "$NAME $SESSION_ID"
