#!/bin/bash
DIR="$HOME/.superbot"

echo "=== Superbot Status ==="
echo ""

# Check files
echo "Files:"
for file in IDENTITY USER MEMORY HEARTBEAT; do
  if [[ -f "$DIR/$file.md" ]]; then
    lines=$(wc -l < "$DIR/$file.md" | tr -d ' ')
    echo "  ✓ $file.md ($lines lines)"
  else
    echo "  ✗ $file.md (missing)"
  fi
done
echo ""

# Check scheduler
echo "Scheduler:"
if launchctl list 2>/dev/null | grep -q "com.claude.superbot-heartbeat"; then
  echo "  ✓ launchd job running"
else
  echo "  ✗ launchd job not found (run install-launchd.sh to enable)"
fi
echo ""

# Pending tasks
echo "Pending Tasks:"
if [[ -f "$DIR/HEARTBEAT.md" ]]; then
  pending=$(grep -c '^\- \[ \]' "$DIR/HEARTBEAT.md" 2>/dev/null || echo "0")
  echo "  $pending unchecked task(s)"
else
  echo "  No heartbeat file"
fi
echo ""

# Projects
echo "Projects:"
if ls "$DIR/projects"/*/project.json &>/dev/null 2>&1; then
  for proj_json in "$DIR/projects"/*/project.json; do
    proj_name=$(jq -r '.name' "$proj_json")
    proj_status=$(jq -r '.status' "$proj_json")
    proj_priority=$(jq -r '.priority // "medium"' "$proj_json")
    proj_dir=$(dirname "$proj_json")
    pending=$(grep -rl '"status":"pending"' "$proj_dir/tasks/" 2>/dev/null | wc -l | tr -d ' ')
    in_progress=$(grep -rl '"status":"in_progress"' "$proj_dir/tasks/" 2>/dev/null | wc -l | tr -d ' ')
    echo "  $proj_name [$proj_status, $proj_priority] — $pending pending, $in_progress in progress"
  done
else
  echo "  No projects"
fi
echo ""

# Sessions
echo "Sessions:"
SESSIONS_FILE="$DIR/sessions.json"
if [[ -f "$SESSIONS_FILE" ]]; then
  active=$(jq '[.sessions[] | select(.status == "active")] | length' "$SESSIONS_FILE" 2>/dev/null)
  total=$(jq '.sessions | length' "$SESSIONS_FILE" 2>/dev/null)
  echo "  $active active / $total total"
  if [[ "$active" -gt 0 ]]; then
    jq -r '.sessions[] | select(.status == "active") | "  - \(.name) [\(.type)] — \(.slackThread.channel // "no thread")"' "$SESSIONS_FILE" 2>/dev/null
  fi
else
  echo "  No sessions file (run setup)"
fi
echo ""

# Last heartbeat
echo "Recent Activity:"
if [[ -f "$DIR/logs/heartbeat.log" ]]; then
  tail -5 "$DIR/logs/heartbeat.log" | sed 's/^/  /'
else
  echo "  No activity log found"
fi
