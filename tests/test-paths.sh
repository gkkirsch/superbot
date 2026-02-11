#!/bin/bash
# test-paths.sh — Verify no stale paths remain in the codebase
# All state should use ~/.superbot/, team files ~/.claude/teams/superbot/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
RESET='\033[0m'

pass() { PASS=$((PASS + 1)); echo -e "  ${GREEN}PASS${RESET} $1"; }
fail() { FAIL=$((FAIL + 1)); echo -e "  ${RED}FAIL${RESET} $1"; }

echo "=== Path Validation Tests ==="
echo ""

# ---------------------------------------------------------------------------
# 1. No references to old ~/.superbot-agent or ~/.claude-agent paths
# ---------------------------------------------------------------------------
echo "Checking for stale legacy paths..."

STALE_PATTERNS=(
  '\.superbot-agent'
  '\.claude-agent'
  'superbot-data'
)

for pattern in "${STALE_PATTERNS[@]}"; do
  HITS=$(grep -r "$pattern" "$PLUGIN_ROOT" \
    --include='*.sh' --include='*.js' --include='*.md' --include='*.json' \
    -l 2>/dev/null | grep -v node_modules | grep -v tests/ || true)
  if [[ -z "$HITS" ]]; then
    pass "No references to '$pattern'"
  else
    fail "Found stale path '$pattern' in: $HITS"
  fi
done

# ---------------------------------------------------------------------------
# 2. All shell scripts use $HOME/.superbot (not hardcoded paths)
# ---------------------------------------------------------------------------
echo ""
echo "Checking shell scripts use \$HOME/.superbot..."

for script in "$PLUGIN_ROOT"/scripts/*.sh; do
  name=$(basename "$script")
  # Skip if file doesn't reference superbot dir at all
  if ! grep -q 'superbot' "$script" 2>/dev/null; then
    continue
  fi
  # Check for hardcoded absolute paths to a user's home dir (e.g. /Users/foo/.superbot)
  if grep -qE '/Users/[^$]+/\.superbot|/home/[^$]+/\.superbot' "$script" 2>/dev/null; then
    fail "$name has hardcoded user path instead of \$HOME/.superbot"
  else
    pass "$name uses variable paths"
  fi
done

# ---------------------------------------------------------------------------
# 3. Dashboard server.js uses correct base paths
# ---------------------------------------------------------------------------
echo ""
echo "Checking dashboard/server.js paths..."

SERVER="$PLUGIN_ROOT/dashboard/server.js"
if [[ -f "$SERVER" ]]; then
  # Must reference .superbot dir via os.homedir()
  if grep -q "os.homedir()" "$SERVER"; then
    pass "server.js uses os.homedir()"
  else
    fail "server.js does not use os.homedir()"
  fi

  # Must reference .superbot
  if grep -q "\.superbot" "$SERVER"; then
    pass "server.js references .superbot directory"
  else
    fail "server.js does not reference .superbot"
  fi

  # Must reference .claude/teams/superbot for team files
  if grep -q "teams.*superbot" "$SERVER" || grep -q "\.claude.*teams" "$SERVER"; then
    pass "server.js references team directory"
  else
    fail "server.js does not reference team directory"
  fi

  # Must NOT have hardcoded user paths
  if grep -qE "'/Users/|'/home/" "$SERVER"; then
    fail "server.js has hardcoded user paths"
  else
    pass "server.js has no hardcoded user paths"
  fi
else
  fail "dashboard/server.js not found"
fi

# ---------------------------------------------------------------------------
# 4. Config template references correct paths
# ---------------------------------------------------------------------------
echo ""
echo "Checking config template..."

CONFIG_TEMPLATE="$PLUGIN_ROOT/config.template.json"
if [[ -f "$CONFIG_TEMPLATE" ]]; then
  # Must be valid JSON
  if jq empty "$CONFIG_TEMPLATE" 2>/dev/null; then
    pass "config.template.json is valid JSON"
  else
    fail "config.template.json is not valid JSON"
  fi

  # Must have expected keys
  for key in spacesDir defaultModel slack schedule heartbeat; do
    if jq -e ".$key" "$CONFIG_TEMPLATE" >/dev/null 2>&1; then
      pass "config.template.json has '$key'"
    else
      fail "config.template.json missing '$key'"
    fi
  done
else
  fail "config.template.json not found"
fi

# ---------------------------------------------------------------------------
# 5. All scripts that use TEAM_DIR point to ~/.claude/teams/superbot
# ---------------------------------------------------------------------------
echo ""
echo "Checking TEAM_DIR consistency..."

for script in "$PLUGIN_ROOT"/scripts/*.sh; do
  name=$(basename "$script")
  if grep -q 'TEAM_DIR' "$script" 2>/dev/null; then
    if grep 'TEAM_DIR' "$script" | grep -q '\.claude/teams/superbot'; then
      pass "$name TEAM_DIR points to .claude/teams/superbot"
    else
      fail "$name TEAM_DIR does not point to .claude/teams/superbot"
    fi
  fi
done

# ---------------------------------------------------------------------------
# 6. Log paths reference ~/.superbot/logs/
# ---------------------------------------------------------------------------
echo ""
echo "Checking log paths..."

for script in "$PLUGIN_ROOT"/scripts/*.sh; do
  name=$(basename "$script")
  if grep -q 'logs/' "$script" 2>/dev/null; then
    # Should reference $DIR/logs or $HOME/.superbot/logs, not some other location
    if grep 'logs/' "$script" | grep -qvE '\$DIR/logs|\$HOME/\.superbot/logs|~/\.superbot/logs|StandardOutPath|StandardErrorPath'; then
      # Check if the remaining references are benign (e.g. in comments or echo statements)
      SUSPICIOUS=$(grep 'logs/' "$script" | grep -vE '\$DIR/logs|\$HOME/\.superbot/logs|~/\.superbot/logs|StandardOutPath|StandardErrorPath|echo|#' || true)
      if [[ -n "$SUSPICIOUS" ]]; then
        fail "$name has log path not under \$DIR/logs or ~/.superbot/logs"
      else
        pass "$name log paths OK"
      fi
    else
      pass "$name log paths OK"
    fi
  fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
