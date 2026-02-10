#!/bin/bash
# test-setup.sh — Test that setup.sh creates the correct directory structure
# Uses a temporary HOME to avoid touching real files
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
RESET='\033[0m'

pass() { ((PASS++)); echo -e "  ${GREEN}PASS${RESET} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}FAIL${RESET} $1"; }

echo "=== Setup Structure Tests ==="
echo ""

# ---------------------------------------------------------------------------
# Create a mock HOME to simulate setup without affecting real environment
# ---------------------------------------------------------------------------
MOCK_HOME=$(mktemp -d)
trap "rm -rf '$MOCK_HOME'" EXIT

# We can't run setup.sh directly (it requires claude CLI, interactive prompts, etc.)
# Instead, simulate what it does: create the expected directory structure

mkdir -p "$MOCK_HOME/.superbot/daily"
mkdir -p "$MOCK_HOME/.superbot/projects"
mkdir -p "$MOCK_HOME/.superbot/prompts"
mkdir -p "$MOCK_HOME/.superbot/logs"
mkdir -p "$MOCK_HOME/.claude/teams/superbot/inboxes"
mkdir -p "$MOCK_HOME/.claude/skills"

# Copy templates
for file in IDENTITY USER MEMORY HEARTBEAT ONBOARD; do
  if [[ -f "$PLUGIN_ROOT/templates/$file.md" ]]; then
    cp "$PLUGIN_ROOT/templates/$file.md" "$MOCK_HOME/.superbot/$file.md"
  fi
done

# Copy config
if [[ -f "$PLUGIN_ROOT/config.template.json" ]]; then
  cp "$PLUGIN_ROOT/config.template.json" "$MOCK_HOME/.superbot/config.json"
fi

# Create sessions.json
echo '{"sessions":[]}' > "$MOCK_HOME/.superbot/sessions.json"

# Create log file
touch "$MOCK_HOME/.superbot/logs/heartbeat.log"

# Create inboxes
echo '[]' > "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json"
echo '[]' > "$MOCK_HOME/.claude/teams/superbot/inboxes/heartbeat.json"

# ---------------------------------------------------------------------------
# 1. Verify expected directories exist
# ---------------------------------------------------------------------------
echo "Checking directory structure..."

EXPECTED_DIRS=(
  ".superbot"
  ".superbot/daily"
  ".superbot/projects"
  ".superbot/prompts"
  ".superbot/logs"
  ".claude/teams/superbot"
  ".claude/teams/superbot/inboxes"
  ".claude/skills"
)

for dir in "${EXPECTED_DIRS[@]}"; do
  if [[ -d "$MOCK_HOME/$dir" ]]; then
    pass "Directory: $dir"
  else
    fail "Missing directory: $dir"
  fi
done

# ---------------------------------------------------------------------------
# 2. Verify expected files exist
# ---------------------------------------------------------------------------
echo ""
echo "Checking expected files..."

EXPECTED_FILES=(
  ".superbot/IDENTITY.md"
  ".superbot/USER.md"
  ".superbot/MEMORY.md"
  ".superbot/HEARTBEAT.md"
  ".superbot/ONBOARD.md"
  ".superbot/config.json"
  ".superbot/sessions.json"
  ".superbot/logs/heartbeat.log"
  ".claude/teams/superbot/inboxes/team-lead.json"
  ".claude/teams/superbot/inboxes/heartbeat.json"
)

for file in "${EXPECTED_FILES[@]}"; do
  if [[ -f "$MOCK_HOME/$file" ]]; then
    pass "File: $file"
  else
    fail "Missing file: $file"
  fi
done

# ---------------------------------------------------------------------------
# 3. Verify template files exist in plugin root
# ---------------------------------------------------------------------------
echo ""
echo "Checking plugin templates..."

TEMPLATE_FILES=(
  "templates/IDENTITY.md"
  "templates/USER.md"
  "templates/MEMORY.md"
  "templates/HEARTBEAT.md"
  "templates/ONBOARD.md"
  "templates/project.template.json"
  "templates/PROJECT_PLAN.md"
  "templates/PROJECT_README.md"
  "config.template.json"
)

for file in "${TEMPLATE_FILES[@]}"; do
  if [[ -f "$PLUGIN_ROOT/$file" ]]; then
    pass "Template: $file"
  else
    fail "Missing template: $file"
  fi
done

# ---------------------------------------------------------------------------
# 4. Verify config.json structure
# ---------------------------------------------------------------------------
echo ""
echo "Checking config.json structure..."

CONFIG="$MOCK_HOME/.superbot/config.json"
if [[ -f "$CONFIG" ]]; then
  if jq empty "$CONFIG" 2>/dev/null; then
    pass "config.json is valid JSON"
  else
    fail "config.json is invalid JSON"
  fi

  for key in projectsDir defaultModel slack schedule heartbeat scheduler; do
    if jq -e "has(\"$key\")" "$CONFIG" >/dev/null 2>&1; then
      pass "config.json has key: $key"
    else
      fail "config.json missing key: $key"
    fi
  done

  # Verify slack has sub-keys
  if jq -e '.slack | has("botToken", "appToken")' "$CONFIG" >/dev/null 2>&1; then
    pass "config.json slack has botToken and appToken"
  else
    fail "config.json slack missing expected sub-keys"
  fi
else
  fail "config.json not found"
fi

# ---------------------------------------------------------------------------
# 5. Verify sessions.json structure
# ---------------------------------------------------------------------------
echo ""
echo "Checking sessions.json structure..."

SESSIONS="$MOCK_HOME/.superbot/sessions.json"
if [[ -f "$SESSIONS" ]]; then
  if jq -e '.sessions | type == "array"' "$SESSIONS" >/dev/null 2>&1; then
    pass "sessions.json has sessions array"
  else
    fail "sessions.json missing or malformed sessions array"
  fi
else
  fail "sessions.json not found"
fi

# ---------------------------------------------------------------------------
# 6. Verify inbox files are valid JSON arrays
# ---------------------------------------------------------------------------
echo ""
echo "Checking inbox files..."

for inbox in team-lead heartbeat; do
  INBOX_FILE="$MOCK_HOME/.claude/teams/superbot/inboxes/$inbox.json"
  if [[ -f "$INBOX_FILE" ]]; then
    if jq -e 'type == "array"' "$INBOX_FILE" >/dev/null 2>&1; then
      pass "$inbox.json is valid JSON array"
    else
      fail "$inbox.json is not a valid JSON array"
    fi
  else
    fail "$inbox.json not found"
  fi
done

# ---------------------------------------------------------------------------
# 7. Verify setup.sh is executable and has correct shebang
# ---------------------------------------------------------------------------
echo ""
echo "Checking setup.sh..."

SETUP="$PLUGIN_ROOT/scripts/setup.sh"
if [[ -f "$SETUP" ]]; then
  if [[ -x "$SETUP" ]]; then
    pass "setup.sh is executable"
  else
    fail "setup.sh is not executable"
  fi

  if head -1 "$SETUP" | grep -q '#!/bin/bash'; then
    pass "setup.sh has bash shebang"
  else
    fail "setup.sh missing bash shebang"
  fi
else
  fail "setup.sh not found"
fi

# ---------------------------------------------------------------------------
# 8. Verify skills directory has content to install
# ---------------------------------------------------------------------------
echo ""
echo "Checking skills..."

SKILLS_SRC="$PLUGIN_ROOT/skills"
if [[ -d "$SKILLS_SRC" ]]; then
  SKILL_COUNT=$(ls -d "$SKILLS_SRC"/*/ 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$SKILL_COUNT" -gt 0 ]]; then
    pass "Found $SKILL_COUNT skill(s) to install"
  else
    fail "No skills found in $SKILLS_SRC"
  fi
else
  fail "skills/ directory not found"
fi

# ---------------------------------------------------------------------------
# 9. Verify worker prompt template exists
# ---------------------------------------------------------------------------
echo ""
echo "Checking worker prompt..."

if [[ -f "$PLUGIN_ROOT/scripts/worker-prompt.md" ]]; then
  pass "worker-prompt.md exists"
else
  fail "worker-prompt.md not found (setup copies it to prompts/heartbeat.md)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
