#!/bin/bash
# test-scripts.sh — Test that scripts don't crash and use correct paths
# Does NOT run scripts that require claude CLI or Slack tokens
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RESET='\033[0m'

pass() { ((PASS++)); echo -e "  ${GREEN}PASS${RESET} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}FAIL${RESET} $1"; }
skip() { echo -e "  ${YELLOW}SKIP${RESET} $1"; }

echo "=== Script Validation Tests ==="
echo ""

# ---------------------------------------------------------------------------
# 1. All scripts are executable
# ---------------------------------------------------------------------------
echo "Checking scripts are executable..."

for script in "$PLUGIN_ROOT"/scripts/*.sh; do
  name=$(basename "$script")
  if [[ -x "$script" ]]; then
    pass "$name is executable"
  else
    fail "$name is not executable"
  fi
done

# ---------------------------------------------------------------------------
# 2. All scripts have proper shebang
# ---------------------------------------------------------------------------
echo ""
echo "Checking shebangs..."

for script in "$PLUGIN_ROOT"/scripts/*.sh; do
  name=$(basename "$script")
  FIRST_LINE=$(head -1 "$script")
  if [[ "$FIRST_LINE" == "#!/bin/bash" || "$FIRST_LINE" == "#!/usr/bin/env bash" ]]; then
    pass "$name has valid shebang"
  else
    fail "$name has invalid shebang: $FIRST_LINE"
  fi
done

# ---------------------------------------------------------------------------
# 3. All scripts pass bash syntax check
# ---------------------------------------------------------------------------
echo ""
echo "Checking bash syntax..."

for script in "$PLUGIN_ROOT"/scripts/*.sh; do
  name=$(basename "$script")
  if bash -n "$script" 2>/dev/null; then
    pass "$name syntax OK"
  else
    fail "$name has syntax errors"
  fi
done

# ---------------------------------------------------------------------------
# 4. Scripts reference correct config path
# ---------------------------------------------------------------------------
echo ""
echo "Checking config path references..."

SCRIPTS_WITH_CONFIG=(
  "heartbeat-cron.sh"
  "scheduler.sh"
  "spawn-worker.sh"
  "slack-send.sh"
  "install-heartbeat.sh"
  "install-slack.sh"
  "daily-observer.sh"
  "create-project.sh"
)

for name in "${SCRIPTS_WITH_CONFIG[@]}"; do
  script="$PLUGIN_ROOT/scripts/$name"
  if [[ ! -f "$script" ]]; then
    fail "$name not found"
    continue
  fi
  if grep -q '\$HOME/\.superbot/config\.json\|"\$DIR/config\.json"\|\$CONFIG' "$script"; then
    pass "$name references config correctly"
  else
    # Some scripts use $CONFIG which is set to $HOME/.superbot/config.json
    if grep -q 'CONFIG=' "$script" || grep -q 'config\.json' "$script"; then
      pass "$name references config correctly"
    else
      skip "$name does not reference config (may not need it)"
    fi
  fi
done

# ---------------------------------------------------------------------------
# 5. parse-session.sh can parse a mock JSONL
# ---------------------------------------------------------------------------
echo ""
echo "Testing parse-session.sh..."

PARSER="$PLUGIN_ROOT/scripts/parse-session.sh"
if [[ -f "$PARSER" && -x "$PARSER" ]]; then
  # Create a mock JSONL file
  MOCK_JSONL=$(mktemp)
  trap "rm -f '$MOCK_JSONL'" EXIT

  cat > "$MOCK_JSONL" << 'MOCK_EOF'
{"type":"user","timestamp":"2025-01-01T00:00:00Z","message":{"content":"Hello world"}}
{"type":"assistant","timestamp":"2025-01-01T00:00:01Z","message":{"content":[{"type":"text","text":"Hi there!"}]}}
{"type":"progress","data":"loading..."}
{"type":"user","timestamp":"2025-01-01T00:00:02Z","message":{"content":[{"type":"tool_result","content":"result"},{"type":"text","text":"Follow up"}]}}
MOCK_EOF

  OUTPUT=$("$PARSER" "$MOCK_JSONL" 2>/dev/null || true)

  # Should contain the user message
  if echo "$OUTPUT" | grep -q "Hello world"; then
    pass "parse-session.sh extracts user string messages"
  else
    fail "parse-session.sh did not extract user string messages"
  fi

  # Should contain assistant text
  if echo "$OUTPUT" | grep -q "Hi there"; then
    pass "parse-session.sh extracts assistant text blocks"
  else
    fail "parse-session.sh did not extract assistant text blocks"
  fi

  # Should NOT contain progress events
  if echo "$OUTPUT" | grep -q "loading"; then
    fail "parse-session.sh leaked progress events"
  else
    pass "parse-session.sh filters out progress events"
  fi

  # Should extract text from mixed content (user message with tool_result + text)
  if echo "$OUTPUT" | grep -q "Follow up"; then
    pass "parse-session.sh extracts text from mixed content"
  else
    fail "parse-session.sh did not extract text from mixed user content"
  fi

  rm -f "$MOCK_JSONL"
else
  fail "parse-session.sh not found or not executable"
fi

# ---------------------------------------------------------------------------
# 6. create-project.sh usage message
# ---------------------------------------------------------------------------
echo ""
echo "Testing create-project.sh..."

CREATE_PROJECT="$PLUGIN_ROOT/scripts/create-project.sh"
if [[ -f "$CREATE_PROJECT" && -x "$CREATE_PROJECT" ]]; then
  # Running with no args should fail with usage
  OUTPUT=$("$CREATE_PROJECT" 2>&1 || true)
  if echo "$OUTPUT" | grep -qi "usage"; then
    pass "create-project.sh shows usage when called with no args"
  else
    fail "create-project.sh does not show usage on empty args"
  fi
else
  fail "create-project.sh not found or not executable"
fi

# ---------------------------------------------------------------------------
# 7. slack-send.sh usage message
# ---------------------------------------------------------------------------
echo ""
echo "Testing slack-send.sh..."

SLACK_SEND="$PLUGIN_ROOT/scripts/slack-send.sh"
if [[ -f "$SLACK_SEND" && -x "$SLACK_SEND" ]]; then
  OUTPUT=$("$SLACK_SEND" 2>&1 || true)
  if echo "$OUTPUT" | grep -qi "usage\|error"; then
    pass "slack-send.sh shows usage/error when called with no args"
  else
    fail "slack-send.sh does not show usage on empty args"
  fi
else
  fail "slack-send.sh not found or not executable"
fi

# ---------------------------------------------------------------------------
# 8. Dashboard launcher
# ---------------------------------------------------------------------------
echo ""
echo "Testing dashboard.sh..."

DASHBOARD="$PLUGIN_ROOT/scripts/dashboard.sh"
if [[ -f "$DASHBOARD" && -x "$DASHBOARD" ]]; then
  # Check it references server.js
  if grep -q "server.js" "$DASHBOARD"; then
    pass "dashboard.sh references server.js"
  else
    fail "dashboard.sh does not reference server.js"
  fi
else
  fail "dashboard.sh not found or not executable"
fi

# ---------------------------------------------------------------------------
# 9. Install scripts reference correct plist paths
# ---------------------------------------------------------------------------
echo ""
echo "Testing install script plist paths..."

# Heartbeat
INSTALL_HEARTBEAT="$PLUGIN_ROOT/scripts/install-heartbeat.sh"
if [[ -f "$INSTALL_HEARTBEAT" ]]; then
  if grep -q "com.claude.superbot-heartbeat" "$INSTALL_HEARTBEAT"; then
    pass "install-heartbeat.sh uses correct plist label"
  else
    fail "install-heartbeat.sh uses wrong plist label"
  fi
  if grep -q 'Library/LaunchAgents' "$INSTALL_HEARTBEAT"; then
    pass "install-heartbeat.sh targets ~/Library/LaunchAgents"
  else
    fail "install-heartbeat.sh targets wrong directory"
  fi
else
  fail "install-heartbeat.sh not found"
fi

# Scheduler
INSTALL_SCHED="$PLUGIN_ROOT/scripts/install-scheduler.sh"
if [[ -f "$INSTALL_SCHED" ]]; then
  if grep -q "com.claude.superbot-scheduler" "$INSTALL_SCHED"; then
    pass "install-scheduler.sh uses correct plist label"
  else
    fail "install-scheduler.sh uses wrong plist label"
  fi
else
  fail "install-scheduler.sh not found"
fi

# Slack
INSTALL_SLACK="$PLUGIN_ROOT/scripts/install-slack.sh"
if [[ -f "$INSTALL_SLACK" ]]; then
  if grep -q "com.claude.superbot-slack" "$INSTALL_SLACK"; then
    pass "install-slack.sh uses correct plist label"
  else
    fail "install-slack.sh uses wrong plist label"
  fi
else
  fail "install-slack.sh not found"
fi

# ---------------------------------------------------------------------------
# 10. Uninstall scripts match install scripts
# ---------------------------------------------------------------------------
echo ""
echo "Testing uninstall scripts..."

for name in launchd slack; do
  UNINSTALL="$PLUGIN_ROOT/scripts/uninstall-$name.sh"
  if [[ -f "$UNINSTALL" ]]; then
    if grep -q "launchctl unload" "$UNINSTALL"; then
      pass "uninstall-$name.sh calls launchctl unload"
    else
      fail "uninstall-$name.sh does not call launchctl unload"
    fi
  else
    fail "uninstall-$name.sh not found"
  fi
done

# ---------------------------------------------------------------------------
# 11. Status script references correct paths
# ---------------------------------------------------------------------------
echo ""
echo "Testing status.sh..."

STATUS="$PLUGIN_ROOT/scripts/status.sh"
if [[ -f "$STATUS" ]]; then
  if grep -q '\$HOME/\.superbot\|DIR=.*\.superbot' "$STATUS"; then
    pass "status.sh references ~/.superbot"
  else
    fail "status.sh does not reference ~/.superbot"
  fi

  if grep -q 'HEARTBEAT\|heartbeat' "$STATUS"; then
    pass "status.sh checks heartbeat"
  else
    fail "status.sh does not check heartbeat"
  fi

  if grep -q 'sessions\.json' "$STATUS"; then
    pass "status.sh checks sessions"
  else
    fail "status.sh does not check sessions"
  fi
else
  fail "status.sh not found"
fi

# ---------------------------------------------------------------------------
# 12. Doctor script is comprehensive
# ---------------------------------------------------------------------------
echo ""
echo "Testing doctor.sh..."

DOCTOR="$PLUGIN_ROOT/scripts/doctor.sh"
if [[ -f "$DOCTOR" ]]; then
  # Should check for claude CLI
  if grep -q 'command -v claude' "$DOCTOR"; then
    pass "doctor.sh checks for claude CLI"
  else
    fail "doctor.sh does not check for claude CLI"
  fi

  # Should check config directory
  if grep -q '\.superbot' "$DOCTOR"; then
    pass "doctor.sh checks superbot directory"
  else
    fail "doctor.sh does not check superbot directory"
  fi

  # Should check context files
  if grep -q 'IDENTITY\|MEMORY\|HEARTBEAT' "$DOCTOR"; then
    pass "doctor.sh checks context files"
  else
    fail "doctor.sh does not check context files"
  fi

  # Should exit non-zero on errors
  if grep -q 'exit 1' "$DOCTOR"; then
    pass "doctor.sh exits non-zero on errors"
  else
    fail "doctor.sh does not exit non-zero on errors"
  fi
else
  fail "doctor.sh not found"
fi

# ---------------------------------------------------------------------------
# 13. Triage script structure
# ---------------------------------------------------------------------------
echo ""
echo "Testing triage.sh structure..."

TRIAGE="$PLUGIN_ROOT/scripts/triage.sh"
if [[ -f "$TRIAGE" ]]; then
  # Must check for HEARTBEAT.md
  if grep -q 'HEARTBEAT.md' "$TRIAGE"; then
    pass "triage.sh checks HEARTBEAT.md"
  else
    fail "triage.sh does not check HEARTBEAT.md"
  fi

  # Must reference triage-prompt.md
  if grep -q 'triage-prompt' "$TRIAGE"; then
    pass "triage.sh references triage prompt"
  else
    fail "triage.sh does not reference triage prompt"
  fi
else
  fail "triage.sh not found"
fi

# ---------------------------------------------------------------------------
# 14. Superbot launcher exists and is executable
# ---------------------------------------------------------------------------
echo ""
echo "Testing superbot launcher..."

LAUNCHER="$PLUGIN_ROOT/superbot"
if [[ -f "$LAUNCHER" ]]; then
  if [[ -x "$LAUNCHER" ]]; then
    pass "superbot launcher is executable"
  else
    fail "superbot launcher is not executable"
  fi
else
  fail "superbot launcher not found"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
