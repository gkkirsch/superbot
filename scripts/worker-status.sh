#!/bin/bash
# worker-status.sh — Check the status of all worker sessions
# Usage: worker-status.sh [--fix]
#
# Shows each session's recorded status and whether the process is actually alive.
# With --fix: marks stale "active" sessions (no running PID) as "lost".

DIR="$HOME/.superbot"
SESSIONS="$DIR/sessions.json"
FIX=false

[[ "${1:-}" == "--fix" ]] && FIX=true

if [[ ! -f "$SESSIONS" ]]; then
  echo "No sessions file found."
  exit 0
fi

COUNT=$(jq '.sessions | length' "$SESSIONS")
if [[ "$COUNT" -eq 0 ]]; then
  echo "No sessions."
  exit 0
fi

printf "%-10s %-8s %-25s %-15s %s\n" "PROCESS" "STATUS" "NAME" "SPACE" "LAST ACTIVE"
printf "%-10s %-8s %-25s %-15s %s\n" "-------" "------" "----" "-----" "-----------"

STALE_IDS=()

jq -r '.sessions[] | [.id, .name, .status, .space, .lastActiveAt, (.pid // 0 | tostring)] | @tsv' "$SESSIONS" | \
while IFS=$'\t' read -r sid name status space last_active pid; do
  process_state=""

  if [[ "$status" == "active" ]]; then
    # Check if PID is alive
    if [[ "$pid" != "0" && "$pid" != "null" ]] && kill -0 "$pid" 2>/dev/null; then
      process_state="ALIVE"
    else
      # Also check by session ID in process list as fallback
      if ps aux | grep "$sid" | grep -v grep >/dev/null 2>&1; then
        process_state="ALIVE"
      else
        process_state="DEAD"
      fi
    fi
  else
    # completed, failed, lost — no process expected
    process_state="--"
  fi

  # Format last_active to be more readable
  last_short="${last_active:5:11}" # MM-DDTHH:MM

  printf "%-10s %-8s %-25s %-15s %s\n" "$process_state" "$status" "$name" "$space" "$last_short"

  # Track stale sessions for --fix
  if [[ "$process_state" == "DEAD" && "$FIX" == "true" ]]; then
    echo "$sid" >> /tmp/worker-status-stale.$$
  fi
done

# Fix stale sessions
if [[ "$FIX" == "true" && -f "/tmp/worker-status-stale.$$" ]]; then
  echo ""
  while read -r sid; do
    name=$(jq -r --arg id "$sid" '.sessions[] | select(.id == $id) | .name' "$SESSIONS")
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    jq --arg id "$sid" --arg now "$now" \
      '(.sessions[] | select(.id == $id)) |= . + {status: "lost", completedAt: $now, pid: null}' \
      "$SESSIONS" > "$SESSIONS.tmp" && mv "$SESSIONS.tmp" "$SESSIONS"
    echo "Marked $name as lost"
  done < "/tmp/worker-status-stale.$$"
  rm -f "/tmp/worker-status-stale.$$"
fi
