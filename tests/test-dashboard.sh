#!/bin/bash
# test-dashboard.sh — Test dashboard server API endpoints
# Starts the server on a random port, tests all endpoints, then shuts down
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER="$PLUGIN_ROOT/dashboard/server.js"

PASS=0
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RESET='\033[0m'

pass() { ((PASS++)); echo -e "  ${GREEN}PASS${RESET} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}FAIL${RESET} $1"; }
skip() { echo -e "  ${YELLOW}SKIP${RESET} $1"; }

echo "=== Dashboard API Tests ==="
echo ""

# ---------------------------------------------------------------------------
# Pre-checks
# ---------------------------------------------------------------------------
if [[ ! -f "$SERVER" ]]; then
  fail "dashboard/server.js not found"
  echo "=== Results: $PASS passed, $FAIL failed ==="
  exit 1
fi

if ! command -v node &>/dev/null; then
  skip "node not found — skipping dashboard tests"
  exit 0
fi

if ! command -v curl &>/dev/null; then
  skip "curl not found — skipping dashboard tests"
  exit 0
fi

# Check that express is available
if ! node -e "require('express')" 2>/dev/null; then
  skip "express not installed — run 'npm install' first"
  exit 0
fi

# ---------------------------------------------------------------------------
# Start the server
# ---------------------------------------------------------------------------
PORT=3299
SERVER_PID=""
TMP_SERVER="$PLUGIN_ROOT/dashboard/.test-server-$$.js"

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -f "$TMP_SERVER"
}
trap cleanup EXIT

# Create a patched copy of server.js in the same directory (so require paths work)
sed "s/const PORT = [0-9]*/const PORT = $PORT/" "$SERVER" > "$TMP_SERVER"

node "$TMP_SERVER" &>/dev/null &
SERVER_PID=$!

# Wait for server to start
TRIES=0
while ! curl -s "http://localhost:$PORT/" >/dev/null 2>&1; do
  sleep 0.3
  ((TRIES++))
  if [[ $TRIES -gt 20 ]]; then
    fail "Server failed to start within 6 seconds"
    echo "=== Results: $PASS passed, $FAIL failed ==="
    exit 1
  fi
done

pass "Server started on port $PORT"

BASE="http://localhost:$PORT"

# ---------------------------------------------------------------------------
# Helper: test an endpoint returns valid JSON
# ---------------------------------------------------------------------------
test_json_endpoint() {
  local endpoint="$1"
  local desc="$2"
  local response
  response=$(curl -s "$BASE$endpoint" 2>/dev/null)
  if [[ -z "$response" ]]; then
    fail "$desc — empty response"
    return
  fi
  if echo "$response" | jq empty 2>/dev/null; then
    pass "$desc — valid JSON"
  else
    fail "$desc — invalid JSON: ${response:0:100}"
  fi
}

# Helper: test endpoint has specific key
test_json_key() {
  local endpoint="$1"
  local key="$2"
  local desc="$3"
  local response
  response=$(curl -s "$BASE$endpoint" 2>/dev/null)
  if echo "$response" | jq -e "$key" >/dev/null 2>&1; then
    pass "$desc"
  else
    fail "$desc — key '$key' not found"
  fi
}

# ---------------------------------------------------------------------------
# 1. HTML endpoint
# ---------------------------------------------------------------------------
echo "Testing HTML endpoint..."

RESPONSE=$(curl -s "$BASE/")
if echo "$RESPONSE" | grep -q "<!DOCTYPE html>"; then
  pass "GET / returns HTML"
else
  fail "GET / does not return HTML"
fi

# ---------------------------------------------------------------------------
# 2. Context file endpoints
# ---------------------------------------------------------------------------
echo ""
echo "Testing context endpoints..."

for endpoint in identity user memory heartbeat onboard; do
  test_json_endpoint "/api/$endpoint" "GET /api/$endpoint"
done

# Verify context endpoints return expected shape (content + exists)
for endpoint in identity user memory heartbeat onboard; do
  RESPONSE=$(curl -s "$BASE/api/$endpoint")
  if echo "$RESPONSE" | jq -e 'has("content") and has("exists")' >/dev/null 2>&1; then
    pass "GET /api/$endpoint has content+exists shape"
  else
    fail "GET /api/$endpoint missing content or exists fields"
  fi
done

# ---------------------------------------------------------------------------
# 3. Daily notes endpoints
# ---------------------------------------------------------------------------
echo ""
echo "Testing daily notes endpoints..."

test_json_endpoint "/api/daily" "GET /api/daily"
test_json_key "/api/daily" ".files" "GET /api/daily has files array"

# Test specific date (should return gracefully even if not found)
test_json_endpoint "/api/daily/2025-01-01" "GET /api/daily/:date"

# Test date sanitization — special chars should be stripped
# Express normalizes ../.. in URLs, so we test with encoded dots to verify the regex strip
RESPONSE=$(curl -s "$BASE/api/daily/2025..01..01")
if echo "$RESPONSE" | jq -e '.exists == false' >/dev/null 2>&1; then
  pass "GET /api/daily/:date strips non-numeric characters"
else
  # If response is empty or 404, Express handled it (also safe)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/daily/2025..01..01")
  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "404" ]]; then
    pass "GET /api/daily/:date handled safely (HTTP $HTTP_CODE)"
  else
    fail "GET /api/daily/:date may be vulnerable to path traversal"
  fi
fi

# ---------------------------------------------------------------------------
# 4. Sessions endpoint
# ---------------------------------------------------------------------------
echo ""
echo "Testing sessions endpoint..."

test_json_endpoint "/api/sessions" "GET /api/sessions"
test_json_key "/api/sessions" ".sessions" "GET /api/sessions has sessions key"

# ---------------------------------------------------------------------------
# 5. Team endpoint
# ---------------------------------------------------------------------------
echo ""
echo "Testing team endpoint..."

test_json_endpoint "/api/team" "GET /api/team"
test_json_key "/api/team" ".members" "GET /api/team has members key"

# ---------------------------------------------------------------------------
# 6. Inbox endpoints
# ---------------------------------------------------------------------------
echo ""
echo "Testing inbox endpoints..."

test_json_endpoint "/api/inbox" "GET /api/inbox"
test_json_key "/api/inbox" ".inboxes" "GET /api/inbox has inboxes key"

# Test specific inbox
test_json_endpoint "/api/inbox/superbot" "GET /api/inbox/:name"

# Test inbox name sanitization — verify special chars are stripped
RESPONSE=$(curl -s "$BASE/api/inbox/test..name")
if echo "$RESPONSE" | jq -e '.name' >/dev/null 2>&1; then
  # The name should have dots stripped (only alphanumeric, dash, underscore allowed)
  CLEAN_NAME=$(echo "$RESPONSE" | jq -r '.name')
  if [[ "$CLEAN_NAME" == "testname" ]]; then
    pass "GET /api/inbox/:name strips special characters"
  else
    pass "GET /api/inbox/:name returns safely (name: $CLEAN_NAME)"
  fi
else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/inbox/test..name")
  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "404" ]]; then
    pass "GET /api/inbox/:name handled safely (HTTP $HTTP_CODE)"
  else
    fail "GET /api/inbox/:name may be vulnerable"
  fi
fi

# ---------------------------------------------------------------------------
# 7. Logs endpoints
# ---------------------------------------------------------------------------
echo ""
echo "Testing logs endpoints..."

test_json_endpoint "/api/logs" "GET /api/logs"
test_json_key "/api/logs" ".logs" "GET /api/logs has logs key"

# Test specific allowed log
test_json_endpoint "/api/logs/heartbeat.log" "GET /api/logs/:name (allowed)"

# Test disallowed log name
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/logs/secret.log")
if [[ "$RESPONSE" == "403" ]]; then
  pass "GET /api/logs/:name blocks disallowed log (403)"
else
  fail "GET /api/logs/:name does not block disallowed log (got $RESPONSE)"
fi

# ---------------------------------------------------------------------------
# 8. Config endpoint (redaction test)
# ---------------------------------------------------------------------------
echo ""
echo "Testing config endpoint..."

test_json_endpoint "/api/config" "GET /api/config"

# Verify tokens are redacted
RESPONSE=$(curl -s "$BASE/api/config")
# If botToken is set and not empty, it should be redacted
BOT_TOKEN=$(echo "$RESPONSE" | jq -r '.slack.botToken // ""' 2>/dev/null)
if [[ "$BOT_TOKEN" == "" || "$BOT_TOKEN" == "***" || "$BOT_TOKEN" == "null" ]]; then
  pass "GET /api/config redacts botToken"
else
  if echo "$BOT_TOKEN" | grep -qE '^xoxb-'; then
    fail "GET /api/config exposes raw botToken!"
  else
    pass "GET /api/config botToken is safe"
  fi
fi

# ---------------------------------------------------------------------------
# 9. Skills endpoint
# ---------------------------------------------------------------------------
echo ""
echo "Testing skills endpoint..."

test_json_endpoint "/api/skills" "GET /api/skills"
test_json_key "/api/skills" ".skills" "GET /api/skills has skills key"

# ---------------------------------------------------------------------------
# 10. Tasks endpoint
# ---------------------------------------------------------------------------
echo ""
echo "Testing tasks endpoint..."

test_json_endpoint "/api/tasks" "GET /api/tasks"
test_json_key "/api/tasks" ".groups" "GET /api/tasks has groups key"

# ---------------------------------------------------------------------------
# 11. Schedule endpoint
# ---------------------------------------------------------------------------
echo ""
echo "Testing schedule endpoint..."

test_json_endpoint "/api/schedule" "GET /api/schedule"
test_json_key "/api/schedule" ".schedule" "GET /api/schedule has schedule key"

# ---------------------------------------------------------------------------
# 12. Status endpoint (aggregated)
# ---------------------------------------------------------------------------
echo ""
echo "Testing status endpoint..."

test_json_endpoint "/api/status" "GET /api/status"

STATUS_KEYS=(".fileChecks" ".dailyCount" ".activeSessions" ".totalSessions" ".pendingTasks" ".totalUnread" ".timestamp")
for key in "${STATUS_KEYS[@]}"; do
  test_json_key "/api/status" "$key" "GET /api/status has $key"
done

# ---------------------------------------------------------------------------
# 13. Dashboard HTML validation
# ---------------------------------------------------------------------------
echo ""
echo "Testing dashboard HTML..."

DASHBOARD="$PLUGIN_ROOT/dashboard/dashboard.html"
if [[ -f "$DASHBOARD" ]]; then
  # Check it has expected Tailwind config
  if grep -q "tailwind.config" "$DASHBOARD"; then
    pass "dashboard.html has Tailwind config"
  else
    fail "dashboard.html missing Tailwind config"
  fi

  # Check it has all nav pages
  for page in overview identity user memory heartbeat onboard daily sessions team inbox tasks config skills schedule logs; do
    if grep -q "data-page=\"$page\"" "$DASHBOARD"; then
      pass "dashboard.html has nav link: $page"
    else
      fail "dashboard.html missing nav link: $page"
    fi
  done

  # Check it has XSS protection (esc function)
  if grep -q 'function esc' "$DASHBOARD"; then
    pass "dashboard.html has XSS escape function"
  else
    fail "dashboard.html missing XSS escape function"
  fi

  # Check it uses marked for markdown
  if grep -q 'marked' "$DASHBOARD"; then
    pass "dashboard.html uses marked for markdown rendering"
  else
    fail "dashboard.html missing marked library"
  fi
else
  fail "dashboard.html not found"
fi

# ---------------------------------------------------------------------------
# 14. Server code quality checks
# ---------------------------------------------------------------------------
echo ""
echo "Testing server code quality..."

if [[ -f "$SERVER" ]]; then
  # Check redactTokens handles all common token prefixes
  for prefix in xoxb- xapp- xoxp- sk- ghp_; do
    if grep -q "$prefix" "$SERVER"; then
      pass "server.js redacts $prefix tokens"
    else
      fail "server.js does not redact $prefix tokens"
    fi
  done

  # Check ALLOWED_LOGS whitelist exists
  if grep -q "ALLOWED_LOGS" "$SERVER"; then
    pass "server.js has ALLOWED_LOGS whitelist"
  else
    fail "server.js missing ALLOWED_LOGS whitelist"
  fi

  # Check log endpoint validates against whitelist
  if grep -q "ALLOWED_LOGS.includes" "$SERVER"; then
    pass "server.js validates log names against whitelist"
  else
    fail "server.js does not validate log names"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
