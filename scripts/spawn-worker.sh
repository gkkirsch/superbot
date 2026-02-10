#!/bin/bash
# spawn-worker.sh — Spawn or resume a worker session (non-blocking)
# Usage: spawn-worker.sh <channel> <message_ts> "<message>" [--project <slug>] [name]
#
# If a session exists for this thread: resumes it with the new message.
# If not: registers a new session.
#
# With --project <slug>: uses project-worker-prompt.md, runs from project codeDir.
# Without: uses slack-worker-prompt.md, runs from plugin root.
#
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

# Parse args
CHANNEL="$1"; shift || true
MESSAGE_TS="$1"; shift || true
MESSAGE="$1"; shift || true

SLUG=""
NAME=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) SLUG="$2"; shift 2 ;;
    *) NAME="$1"; shift ;;
  esac
done

if [[ -z "$CHANNEL" || -z "$MESSAGE_TS" || -z "$MESSAGE" ]]; then
  echo "Usage: spawn-worker.sh <channel> <message_ts> <message> [--project <slug>] [name]" >&2
  exit 1
fi

MODEL=$(jq -r '.defaultModel // "opus"' "$CONFIG")

# Resolve project if specified
WORK_DIR=""
if [[ -n "$SLUG" ]]; then
  PROJECT_DIR="$DIR/projects/$SLUG"
  if [[ ! -f "$PROJECT_DIR/project.json" ]]; then
    echo "Error: project '$SLUG' not found at $PROJECT_DIR" >&2
    exit 1
  fi
  WORK_DIR=$(jq -r '.codeDir' "$PROJECT_DIR/project.json")
  WORK_DIR="${WORK_DIR/#\~/$HOME}"
  if [[ ! -d "$WORK_DIR" ]]; then
    echo "Error: project codeDir '$WORK_DIR' does not exist" >&2
    exit 1
  fi
fi

# Ensure sessions.json exists
if [[ ! -f "$SESSIONS" ]]; then
  echo '{"sessions":[]}' > "$SESSIONS"
fi

# Check for existing session on this thread
EXISTING=$(jq -r '.sessions[] | select(.slackThread.ts == "'"$MESSAGE_TS"'" and .status == "active") | .id' "$SESSIONS" 2>/dev/null | head -1)

if [[ -n "$EXISTING" ]]; then
  # Resume existing session
  SESSION_ID="$EXISTING"
  NAME=$(jq -r '.sessions[] | select(.id == "'"$SESSION_ID"'") | .name' "$SESSIONS")

  (
    # cd into work dir if this was a project session
    SESS_PROJECT=$(jq -r '.sessions[] | select(.id == "'"$SESSION_ID"'") | .project // empty' "$SESSIONS")
    if [[ -n "$SESS_PROJECT" ]]; then
      SESS_CODE_DIR=$(jq -r '.codeDir' "$DIR/projects/$SESS_PROJECT/project.json")
      SESS_CODE_DIR="${SESS_CODE_DIR/#\~/$HOME}"
      [[ -d "$SESS_CODE_DIR" ]] && cd "$SESS_CODE_DIR"
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
      jq --arg from "$NAME" \
         --arg text "[Worker result] Channel: $CHANNEL, thread: $MESSAGE_TS"$'\n\n'"$RESULT" \
         --arg summary "Worker $NAME replied" \
         --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '. += [{from: $from, text: $text, summary: $summary, timestamp: $ts, read: false}]' \
        "$INBOX" > "$INBOX.tmp" && mv "$INBOX.tmp" "$INBOX"
    fi
  ) &

else
  # New session
  SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

  if [[ -n "$SLUG" ]]; then
    TYPE="project"
    NAME="${NAME:-project-${SLUG}-$(date +%s | tail -c 5)}"
  else
    TYPE="slack"
    NAME="${NAME:-slack-$(date +%s | tail -c 7)}"
  fi

  # Register session
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  jq --arg id "$SESSION_ID" --arg name "$NAME" --arg type "$TYPE" \
     --arg project "${SLUG:-null}" --arg ch "$CHANNEL" --arg ts "$MESSAGE_TS" --arg now "$NOW" \
    '.sessions += [{id:$id, name:$name, type:$type, status:"active", project:(if $project == "null" then null else $project end), slackThread:{channel:$ch, ts:$ts}, createdAt:$now, lastActiveAt:$now}]' \
    "$SESSIONS" > "$SESSIONS.tmp" && mv "$SESSIONS.tmp" "$SESSIONS"

  # Build system prompt
  if [[ -n "$SLUG" ]]; then
    SYSTEM_PROMPT=$(sed "s|{{PROJECT}}|$SLUG|g; s|{{CODE_DIR}}|$WORK_DIR|g" "$PLUGIN_ROOT/scripts/project-worker-prompt.md")
  else
    SYSTEM_PROMPT=$(cat "$PLUGIN_ROOT/scripts/slack-worker-prompt.md")
  fi
  SYSTEM_PROMPT+=$'\n\n---\n\n## Slack Context\n\nChannel: '"$CHANNEL"$'\nThread: '"$MESSAGE_TS"
  SYSTEM_PROMPT+=$'\n\nWhen you respond, the orchestrator will relay your response to this Slack thread.'

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
      LABEL="Channel: $CHANNEL, thread: $MESSAGE_TS"
      [[ -n "$SLUG" ]] && LABEL="Project: $SLUG — $LABEL"
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
