#!/bin/bash
# notify.sh — Drop a status update into team-lead's inbox
# Usage: notify.sh "<message>" [--from <name>] [--summary <summary>]
#
# Workers call this for mid-task progress updates while they're still working.
# The final result is sent automatically by spawn-worker.sh when the worker finishes.
#
# Examples:
#   notify.sh "Starting implementation phase, 5 tasks created" --from space-auth-worker
#   notify.sh "Blocked: need API key for external service" --from space-auth-worker
#   notify.sh "Research done, moving to design" --summary "Research phase complete"

set -e

INBOX="$HOME/.claude/teams/superbot/inboxes/team-lead.json"

# Parse args
MESSAGE=""
FROM="worker"
SUMMARY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from) FROM="$2"; shift 2 ;;
    --summary) SUMMARY="$2"; shift 2 ;;
    *) MESSAGE="$1"; shift ;;
  esac
done

if [[ -z "$MESSAGE" ]]; then
  echo "Usage: notify.sh \"<message>\" [--from <name>] [--summary <summary>]" >&2
  exit 1
fi

# Default summary to first 60 chars of message
if [[ -z "$SUMMARY" ]]; then
  SUMMARY="${MESSAGE:0:60}"
  [[ ${#MESSAGE} -gt 60 ]] && SUMMARY="${SUMMARY}..."
fi

# Ensure inbox exists
mkdir -p "$(dirname "$INBOX")"
if [[ ! -f "$INBOX" ]] || ! jq -e '. | type == "array"' "$INBOX" >/dev/null 2>&1; then
  echo "[]" > "$INBOX"
fi

MSG=$(jq -n \
  --arg from "$FROM" \
  --arg text "$MESSAGE" \
  --arg summary "$SUMMARY" \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{from: $from, text: $text, summary: $summary, timestamp: $ts, read: false}')

jq --argjson msg "$MSG" '. + [$msg]' "$INBOX" > "$INBOX.tmp" && mv "$INBOX.tmp" "$INBOX"
