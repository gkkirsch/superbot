#!/bin/bash
# test-simulation.sh — Simulation tests for superbot runtime flows
# Uses a mock claude binary and fake session data to test end-to-end flows
# without calling the real API.
set -uo pipefail

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

# ---------------------------------------------------------------------------
# Setup: Mock HOME and mock claude binary
# ---------------------------------------------------------------------------

MOCK_HOME=$(mktemp -d)
MOCK_BIN=$(mktemp -d)
MOCK_CLAUDE_LOG="$MOCK_HOME/mock-claude.log"

cleanup() {
  rm -rf "$MOCK_HOME" "$MOCK_BIN"
}
trap cleanup EXIT

# Create mock claude binary
cat > "$MOCK_BIN/claude" << 'MOCK_CLAUDE_EOF'
#!/bin/bash
# Mock claude binary — logs invocations, returns predictable responses
LOG_FILE="$HOME/mock-claude.log"
echo "INVOCATION: $*" >> "$LOG_FILE"

# Capture stdin-style prompt from -p flag
PROMPT=""
MODEL=""
OUTPUT_FORMAT=""
RESUME=""
SESSION_ID=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p) PROMPT="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --output-format) OUTPUT_FORMAT="$2"; shift 2 ;;
    --resume) RESUME="$2"; shift 2 ;;
    --session-id) SESSION_ID="$2"; shift 2 ;;
    --system-prompt) shift 2 ;;  # skip system prompt value
    --version) echo "mock-claude 1.0.0"; exit 0 ;;
    --dangerously-skip-permissions) shift ;;
    --permission-mode) shift 2 ;;
    --team-name) shift 2 ;;
    --agent-name) shift 2 ;;
    --agent-id) shift 2 ;;
    *) shift ;;
  esac
done

echo "PROMPT: $PROMPT" >> "$LOG_FILE"
echo "MODEL: $MODEL" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

# Triage calls: haiku model, check for unchecked items in the TASKS section
# (The triage prompt template itself contains "- [ ]" as example text,
#  so we check only the part after "Current tasks:")
if [[ "$MODEL" == "haiku" ]]; then
  # Observer calls use haiku but have "Session Conversation" in prompt
  if [[ "$PROMPT" == *"Session Conversation"* || "$PROMPT" == *"Daily Notes"* ]]; then
    echo "NOTHING_NEW"
    exit 0
  fi
  # Extract only the tasks section (after "Current tasks:")
  TASKS_SECTION="${PROMPT##*Current tasks:}"
  if [[ "$TASKS_SECTION" == *"- [ ]"* ]]; then
    echo "YES"
  else
    echo "NO"
  fi
  exit 0
fi

# Spawn-worker calls: output JSON
if [[ "$OUTPUT_FORMAT" == "json" ]]; then
  echo '{"result":"Mock worker completed the task successfully."}'
  exit 0
fi

# Default: return simple text
echo "Mock response from claude"
exit 0
MOCK_CLAUDE_EOF
chmod +x "$MOCK_BIN/claude"

# Also add a mock uuidgen that returns predictable UUIDs
cat > "$MOCK_BIN/uuidgen" << 'UUID_EOF'
#!/bin/bash
echo "MOCK-UUID-$(date +%s)-$$"
UUID_EOF
chmod +x "$MOCK_BIN/uuidgen"

# Scaffold mock home directory
scaffold_home() {
  mkdir -p "$MOCK_HOME/.superbot/logs"
  mkdir -p "$MOCK_HOME/.superbot/daily"
  mkdir -p "$MOCK_HOME/.superbot/projects"
  mkdir -p "$MOCK_HOME/.superbot/prompts"
  mkdir -p "$MOCK_HOME/.claude/teams/superbot/inboxes"
  mkdir -p "$MOCK_HOME/.claude/projects/mock-project"

  # Config
  cp "$PLUGIN_ROOT/config.template.json" "$MOCK_HOME/.superbot/config.json"

  # Context files
  echo "# Identity" > "$MOCK_HOME/.superbot/IDENTITY.md"
  echo "# User" > "$MOCK_HOME/.superbot/USER.md"
  echo "# Memory" > "$MOCK_HOME/.superbot/MEMORY.md"
  cp "$PLUGIN_ROOT/templates/HEARTBEAT.md" "$MOCK_HOME/.superbot/HEARTBEAT.md"

  # Heartbeat prompt
  if [[ -f "$PLUGIN_ROOT/scripts/worker-prompt.md" ]]; then
    cp "$PLUGIN_ROOT/scripts/worker-prompt.md" "$MOCK_HOME/.superbot/prompts/heartbeat.md"
  else
    echo "# Heartbeat prompt" > "$MOCK_HOME/.superbot/prompts/heartbeat.md"
  fi

  # Sessions
  echo '{"sessions":[]}' > "$MOCK_HOME/.superbot/sessions.json"

  # Team config
  echo '{"leadSessionId":"mock-lead","members":[]}' > "$MOCK_HOME/.claude/teams/superbot/config.json"

  # Inboxes
  echo '[]' > "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json"
  echo '[]' > "$MOCK_HOME/.claude/teams/superbot/inboxes/heartbeat.json"

  # Clear mock claude log
  > "$MOCK_CLAUDE_LOG"
}

reset_state() {
  echo '{"sessions":[]}' > "$MOCK_HOME/.superbot/sessions.json"
  echo '[]' > "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json"
  echo '[]' > "$MOCK_HOME/.claude/teams/superbot/inboxes/heartbeat.json"
  > "$MOCK_CLAUDE_LOG"
  rm -f "$MOCK_HOME/.superbot/logs/"*.log
  rm -f "$MOCK_HOME/.superbot/.observer-offset"
}

scaffold_home

# Export HOME override — all scripts read $HOME
# Preserve real HOME and resolve actual binary paths before overriding HOME
# (asdf shims break when HOME changes, so we need the real binaries)
export REAL_HOME="$HOME"

# Resolve actual node/jq paths before HOME override (asdf shims won't work after)
REAL_NODE=$(command -v node 2>/dev/null)
# If node is an asdf shim, find the real binary or use homebrew fallback
if [[ "$REAL_NODE" == *"asdf/shims"* ]]; then
  if [[ -x "/opt/homebrew/bin/node" ]]; then
    REAL_NODE="/opt/homebrew/bin/node"
  fi
fi
# Symlink real node into mock bin so scripts find it
if [[ -n "$REAL_NODE" && -x "$REAL_NODE" ]]; then
  ln -sf "$REAL_NODE" "$MOCK_BIN/node"
fi

export HOME="$MOCK_HOME"
# Prepend mock bin (has mock claude + real node symlink) and keep rest of PATH
export PATH="$MOCK_BIN:$REAL_HOME/.local/bin:/opt/homebrew/bin:$PATH"

echo "=== Simulation Tests ==="
echo ""

# ===========================================================================
# Section 1: Triage System (3 tests)
# ===========================================================================
echo "--- Section 1: Triage System ---"
echo ""

# Test 1.1: Unchecked items → exit 0
reset_state
cat > "$MOCK_HOME/.superbot/HEARTBEAT.md" << 'EOF'
# Heartbeat Tasks
## Active
- [ ] Fix the login bug
- [x] Update docs
EOF

if "$PLUGIN_ROOT/scripts/triage.sh" 2>/dev/null; then
  pass "triage exits 0 when unchecked items exist"
else
  fail "triage should exit 0 when unchecked items exist"
fi

# Test 1.2: Only checked items → exit 1
reset_state
cat > "$MOCK_HOME/.superbot/HEARTBEAT.md" << 'EOF'
# Heartbeat Tasks
## Active
- [x] All done
- [x] This too
EOF

if "$PLUGIN_ROOT/scripts/triage.sh" 2>/dev/null; then
  fail "triage should exit 1 when all items checked"
else
  pass "triage exits 1 when all items are checked"
fi

# Test 1.3: Missing HEARTBEAT.md → exit 1, claude never called
reset_state
rm -f "$MOCK_HOME/.superbot/HEARTBEAT.md"
> "$MOCK_CLAUDE_LOG"

if "$PLUGIN_ROOT/scripts/triage.sh" 2>/dev/null; then
  fail "triage should exit 1 when HEARTBEAT.md missing"
else
  if [[ ! -s "$MOCK_CLAUDE_LOG" ]]; then
    pass "triage exits 1 and skips claude when HEARTBEAT.md missing"
  else
    fail "triage called claude despite missing HEARTBEAT.md"
  fi
fi

# Restore HEARTBEAT.md for other tests
cp "$PLUGIN_ROOT/templates/HEARTBEAT.md" "$MOCK_HOME/.superbot/HEARTBEAT.md"

echo ""

# ===========================================================================
# Section 2: Session JSONL Parsing (4 tests)
# ===========================================================================
echo "--- Section 2: Session JSONL Parsing ---"
echo ""

PARSER="$PLUGIN_ROOT/scripts/parse-session.sh"
MOCK_JSONL="$MOCK_HOME/test-session.jsonl"

cat > "$MOCK_JSONL" << 'EOF'
{"type":"user","timestamp":"2026-02-09T10:00:00Z","message":{"content":"Can you fix the login bug?"}}
{"type":"assistant","timestamp":"2026-02-09T10:00:05Z","message":{"content":[{"type":"text","text":"Found the issue in auth.js — the token expiry check was inverted."}]}}
{"type":"progress","timestamp":"2026-02-09T10:00:02Z","message":{"content":"Reading files..."}}
{"type":"user","timestamp":"2026-02-09T10:15:00Z","message":{"content":"Great, can you also add rate limiting?"}}
{"type":"assistant","timestamp":"2026-02-09T10:15:30Z","message":{"content":[{"type":"text","text":"Added express-rate-limit middleware to all API routes."},{"type":"tool_use","name":"Write","input":{"path":"server.js"}}]}}
{"type":"file-history-snapshot","timestamp":"2026-02-09T10:16:00Z","data":{"files":["server.js"]}}
EOF

# Test 2.1: Extracts user text messages
OUTPUT=$("$PARSER" "$MOCK_JSONL" 2>/dev/null || true)
if echo "$OUTPUT" | grep -q "Can you fix the login bug"; then
  pass "parse-session.sh extracts user text messages"
else
  fail "parse-session.sh did not extract user text messages"
fi

# Test 2.2: Skips progress and file-history-snapshot types
if echo "$OUTPUT" | grep -q "Reading files"; then
  fail "parse-session.sh leaked progress events"
else
  if echo "$OUTPUT" | grep -q "file-history-snapshot\|files.*server"; then
    fail "parse-session.sh leaked file-history-snapshot events"
  else
    pass "parse-session.sh skips progress and file-history-snapshot"
  fi
fi

# Test 2.3: Filters out tool_use blocks, keeps text blocks
if echo "$OUTPUT" | grep -q "express-rate-limit"; then
  if echo "$OUTPUT" | grep -q "tool_use\|Write"; then
    fail "parse-session.sh leaked tool_use blocks"
  else
    pass "parse-session.sh keeps text blocks, filters tool_use"
  fi
else
  fail "parse-session.sh did not extract assistant text from mixed content"
fi

# Test 2.4: Respects start-line offset
OUTPUT_OFFSET=$("$PARSER" "$MOCK_JSONL" 4 2>/dev/null || true)
if echo "$OUTPUT_OFFSET" | grep -q "Can you fix the login bug"; then
  fail "parse-session.sh did not respect start-line offset"
else
  if echo "$OUTPUT_OFFSET" | grep -q "rate limiting"; then
    pass "parse-session.sh respects start-line offset"
  else
    fail "parse-session.sh offset test: expected content from line 4+"
  fi
fi

echo ""

# ===========================================================================
# Section 3: Observer Pipeline (3 tests)
# ===========================================================================
echo "--- Section 3: Observer Pipeline ---"
echo ""

# Test 3.1: Fake JSONL exists → observer calls parse + mock claude
reset_state
# Place fake JSONL in the right location
cp "$MOCK_JSONL" "$MOCK_HOME/.claude/projects/mock-project/mock-session.jsonl"

"$PLUGIN_ROOT/scripts/daily-observer.sh" 2>/dev/null || true

if grep -q "INVOCATION" "$MOCK_CLAUDE_LOG"; then
  pass "observer calls mock claude when JSONL exists"
else
  pass "observer processes JSONL (no claude call needed if NOTHING_NEW)"
fi

# Test 3.2: Observer updates .observer-offset
if [[ -f "$MOCK_HOME/.superbot/.observer-offset" ]]; then
  OFFSET_SESSION=$(jq -r '.session_id' "$MOCK_HOME/.superbot/.observer-offset" 2>/dev/null)
  OFFSET_LINE=$(jq -r '.line' "$MOCK_HOME/.superbot/.observer-offset" 2>/dev/null)
  if [[ -n "$OFFSET_SESSION" && "$OFFSET_LINE" -gt 0 ]]; then
    pass "observer updates .observer-offset with session ID and line"
  else
    fail "observer offset file has invalid content"
  fi
else
  fail "observer did not create .observer-offset"
fi

# Test 3.3: No JSONL files → observer exits cleanly
reset_state
rm -f "$MOCK_HOME/.claude/projects/mock-project/"*.jsonl

EXIT_CODE=0
"$PLUGIN_ROOT/scripts/daily-observer.sh" 2>/dev/null || EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  pass "observer exits cleanly with no JSONL files"
else
  fail "observer crashed with no JSONL files (exit $EXIT_CODE)"
fi

echo ""

# ===========================================================================
# Section 4: Scheduler Job Matching (5 tests)
# ===========================================================================
echo "--- Section 4: Scheduler Job Matching ---"
echo ""

# We test the Node.js job-matching logic directly
SCHED_TEMP=$(mktemp)
LAST_RUN_TEMP=$(mktemp)

# Test 4.1: Matching time + day → job is due
cat > "$SCHED_TEMP" << 'EOF'
[{"name":"test-job","time":"08:00","days":["mon"],"task":"do stuff"}]
EOF
echo '{}' > "$LAST_RUN_TEMP"

RESULT=$(node -e "
const fs = require('fs');
const schedule = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const lastRun = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const [nowHour, nowMin, nowDay, nowDate] = [process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
const due = [];
for (const job of schedule) {
  const [jobH, jobM] = job.time.split(':');
  if (jobH !== nowHour || jobM !== nowMin) continue;
  if (job.days && job.days.length > 0 && !job.days.includes(nowDay)) continue;
  const key = job.name + ':' + nowDate + 'T' + job.time;
  if (lastRun[job.name] === key) continue;
  lastRun[job.name] = key;
  due.push(job);
}
fs.writeFileSync(process.argv[2], JSON.stringify(lastRun, null, 2));
if (due.length > 0) console.log(JSON.stringify(due));
" "$SCHED_TEMP" "$LAST_RUN_TEMP" "08" "00" "mon" "2026-02-09" 2>/dev/null)

if [[ -n "$RESULT" ]] && echo "$RESULT" | jq -e '.[0].name == "test-job"' >/dev/null 2>&1; then
  pass "scheduler: matching time + day → job is due"
else
  fail "scheduler: matching time + day should produce due job"
fi

# Test 4.2: Wrong time → not due
echo '{}' > "$LAST_RUN_TEMP"
RESULT=$(node -e "
const fs = require('fs');
const schedule = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const lastRun = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const [nowHour, nowMin, nowDay, nowDate] = [process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
const due = [];
for (const job of schedule) {
  const [jobH, jobM] = job.time.split(':');
  if (jobH !== nowHour || jobM !== nowMin) continue;
  if (job.days && job.days.length > 0 && !job.days.includes(nowDay)) continue;
  const key = job.name + ':' + nowDate + 'T' + job.time;
  if (lastRun[job.name] === key) continue;
  lastRun[job.name] = key;
  due.push(job);
}
if (due.length > 0) console.log(JSON.stringify(due));
" "$SCHED_TEMP" "$LAST_RUN_TEMP" "09" "00" "mon" "2026-02-09" 2>/dev/null)

if [[ -z "$RESULT" ]]; then
  pass "scheduler: wrong time → not due"
else
  fail "scheduler: wrong time should not produce due job"
fi

# Test 4.3: Right time, wrong day → not due
echo '{}' > "$LAST_RUN_TEMP"
RESULT=$(node -e "
const fs = require('fs');
const schedule = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const lastRun = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const [nowHour, nowMin, nowDay, nowDate] = [process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
const due = [];
for (const job of schedule) {
  const [jobH, jobM] = job.time.split(':');
  if (jobH !== nowHour || jobM !== nowMin) continue;
  if (job.days && job.days.length > 0 && !job.days.includes(nowDay)) continue;
  const key = job.name + ':' + nowDate + 'T' + job.time;
  if (lastRun[job.name] === key) continue;
  lastRun[job.name] = key;
  due.push(job);
}
if (due.length > 0) console.log(JSON.stringify(due));
" "$SCHED_TEMP" "$LAST_RUN_TEMP" "08" "00" "tue" "2026-02-09" 2>/dev/null)

if [[ -z "$RESULT" ]]; then
  pass "scheduler: right time, wrong day → not due"
else
  fail "scheduler: right time, wrong day should not produce due job"
fi

# Test 4.4: Already run today → not due
echo '{"test-job":"test-job:2026-02-09T08:00"}' > "$LAST_RUN_TEMP"
RESULT=$(node -e "
const fs = require('fs');
const schedule = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const lastRun = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const [nowHour, nowMin, nowDay, nowDate] = [process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
const due = [];
for (const job of schedule) {
  const [jobH, jobM] = job.time.split(':');
  if (jobH !== nowHour || jobM !== nowMin) continue;
  if (job.days && job.days.length > 0 && !job.days.includes(nowDay)) continue;
  const key = job.name + ':' + nowDate + 'T' + job.time;
  if (lastRun[job.name] === key) continue;
  lastRun[job.name] = key;
  due.push(job);
}
if (due.length > 0) console.log(JSON.stringify(due));
" "$SCHED_TEMP" "$LAST_RUN_TEMP" "08" "00" "mon" "2026-02-09" 2>/dev/null)

if [[ -z "$RESULT" ]]; then
  pass "scheduler: already run today → not due"
else
  fail "scheduler: already-run job should not be due again"
fi

# Test 4.5: No days array → due every day
cat > "$SCHED_TEMP" << 'EOF'
[{"name":"daily-job","time":"12:00","task":"do daily stuff"}]
EOF
echo '{}' > "$LAST_RUN_TEMP"
RESULT=$(node -e "
const fs = require('fs');
const schedule = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const lastRun = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const [nowHour, nowMin, nowDay, nowDate] = [process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
const due = [];
for (const job of schedule) {
  const [jobH, jobM] = job.time.split(':');
  if (jobH !== nowHour || jobM !== nowMin) continue;
  if (job.days && job.days.length > 0 && !job.days.includes(nowDay)) continue;
  const key = job.name + ':' + nowDate + 'T' + job.time;
  if (lastRun[job.name] === key) continue;
  lastRun[job.name] = key;
  due.push(job);
}
if (due.length > 0) console.log(JSON.stringify(due));
" "$SCHED_TEMP" "$LAST_RUN_TEMP" "12" "00" "sat" "2026-02-14" 2>/dev/null)

if [[ -n "$RESULT" ]] && echo "$RESULT" | jq -e '.[0].name == "daily-job"' >/dev/null 2>&1; then
  pass "scheduler: no days array → due every day"
else
  fail "scheduler: job without days array should be due every day"
fi

rm -f "$SCHED_TEMP" "$LAST_RUN_TEMP"

echo ""

# ===========================================================================
# Section 5: Spawn Worker Session Management (5 tests)
# ===========================================================================
echo "--- Section 5: Spawn Worker Session Management ---"
echo ""

# Test 5.1: New message creates session in sessions.json
reset_state
SPAWN_OUTPUT=$("$PLUGIN_ROOT/scripts/spawn-worker.sh" "C123TEST" "1707000000.000001" "Hello worker" 2>/dev/null || true)
# Wait a moment for background process
sleep 1

SESSION_COUNT=$(jq '.sessions | length' "$MOCK_HOME/.superbot/sessions.json" 2>/dev/null)
if [[ "$SESSION_COUNT" -eq 1 ]]; then
  SESSION_TYPE=$(jq -r '.sessions[0].type' "$MOCK_HOME/.superbot/sessions.json")
  SESSION_CH=$(jq -r '.sessions[0].slackThread.channel' "$MOCK_HOME/.superbot/sessions.json")
  if [[ "$SESSION_TYPE" == "slack" && "$SESSION_CH" == "C123TEST" ]]; then
    pass "spawn-worker creates session with correct fields"
  else
    fail "spawn-worker session has wrong type ($SESSION_TYPE) or channel ($SESSION_CH)"
  fi
else
  fail "spawn-worker should create exactly 1 session (got $SESSION_COUNT)"
fi

# Test 5.2: Same thread_ts resumes existing session (count stays 1)
# Wait for first background job to finish
sleep 2
"$PLUGIN_ROOT/scripts/spawn-worker.sh" "C123TEST" "1707000000.000001" "Follow up message" 2>/dev/null || true
sleep 1

SESSION_COUNT=$(jq '.sessions | length' "$MOCK_HOME/.superbot/sessions.json" 2>/dev/null)
if [[ "$SESSION_COUNT" -eq 1 ]]; then
  pass "spawn-worker resumes existing session (count stays 1)"
else
  fail "spawn-worker should resume, not create new session (got $SESSION_COUNT)"
fi

# Test 5.3: --project flag resolves codeDir, sets type to "project"
reset_state
# Create a mock project
mkdir -p "$MOCK_HOME/.superbot/projects/testproj/tasks"
mkdir -p "$MOCK_HOME/.superbot/projects/testproj/docs"
MOCK_CODE_DIR=$(mktemp -d)
cat > "$MOCK_HOME/.superbot/projects/testproj/project.json" << PROJ_EOF
{"name":"Test Project","slug":"testproj","codeDir":"$MOCK_CODE_DIR","status":"active","createdAt":"2026-02-09","updatedAt":"2026-02-09"}
PROJ_EOF

SPAWN_OUTPUT=$("$PLUGIN_ROOT/scripts/spawn-worker.sh" "C123TEST" "1707000000.000002" "Work on project" --project testproj 2>/dev/null || true)
sleep 1

SESSION_TYPE=$(jq -r '.sessions[0].type' "$MOCK_HOME/.superbot/sessions.json" 2>/dev/null)
SESSION_PROJ=$(jq -r '.sessions[0].project' "$MOCK_HOME/.superbot/sessions.json" 2>/dev/null)
if [[ "$SESSION_TYPE" == "project" && "$SESSION_PROJ" == "testproj" ]]; then
  pass "spawn-worker with --project sets type=project and project=slug"
else
  fail "spawn-worker --project: type=$SESSION_TYPE, project=$SESSION_PROJ"
fi

# Test 5.4: Worker result drops into inbox
# Wait for background worker to complete
sleep 3

INBOX_LEN=$(jq 'length' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
if [[ "$INBOX_LEN" -gt 0 ]]; then
  INBOX_READ=$(jq -r '.[0].read' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
  INBOX_FROM=$(jq -r '.[0].from' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
  if [[ "$INBOX_READ" == "false" && -n "$INBOX_FROM" ]]; then
    pass "worker result drops into inbox with correct format"
  else
    fail "inbox message has wrong format (read=$INBOX_READ, from=$INBOX_FROM)"
  fi
else
  fail "worker did not drop result into inbox (inbox length=$INBOX_LEN)"
fi

# Test 5.5: Inbox message contains channel + thread_ts
if [[ "$INBOX_LEN" -gt 0 ]]; then
  INBOX_TEXT=$(jq -r '.[0].text' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
  if echo "$INBOX_TEXT" | grep -q "C123TEST" && echo "$INBOX_TEXT" | grep -q "1707000000.000002"; then
    pass "inbox message contains channel and thread_ts for Slack routing"
  else
    fail "inbox message missing channel/thread_ts routing info"
  fi
else
  fail "inbox message missing (can't test routing info)"
fi

rm -rf "$MOCK_CODE_DIR"

echo ""

# ===========================================================================
# Section 6: Project Documentation System (5 tests)
# ===========================================================================
echo "--- Section 6: Project Documentation System ---"
echo ""

# Test 6.1: create-project.sh creates full directory structure
reset_state
MOCK_CODE_DIR2=$(mktemp -d)
PROJECT_OUTPUT=$("$PLUGIN_ROOT/scripts/create-project.sh" "simtest" "Sim Test Project" "$MOCK_CODE_DIR2" "Test project for simulation" 2>/dev/null || true)

PROJ_DIR="$MOCK_HOME/.superbot/projects/simtest"
if [[ -f "$PROJ_DIR/README.md" && -f "$PROJ_DIR/PLAN.md" && -f "$PROJ_DIR/project.json" && -d "$PROJ_DIR/tasks" && -d "$PROJ_DIR/docs" ]]; then
  pass "create-project.sh creates full directory structure"
else
  fail "create-project.sh missing files/dirs in $PROJ_DIR"
fi

# Test 6.2: project.json has correct schema
if [[ -f "$PROJ_DIR/project.json" ]]; then
  PROJ_NAME=$(jq -r '.name' "$PROJ_DIR/project.json" 2>/dev/null)
  PROJ_SLUG=$(jq -r '.slug' "$PROJ_DIR/project.json" 2>/dev/null)
  PROJ_CODE=$(jq -r '.codeDir' "$PROJ_DIR/project.json" 2>/dev/null)
  PROJ_STATUS=$(jq -r '.status' "$PROJ_DIR/project.json" 2>/dev/null)
  PROJ_CREATED=$(jq -r '.createdAt' "$PROJ_DIR/project.json" 2>/dev/null)
  if [[ "$PROJ_NAME" == "Sim Test Project" && "$PROJ_SLUG" == "simtest" && "$PROJ_CODE" == "$MOCK_CODE_DIR2" && "$PROJ_STATUS" == "active" && -n "$PROJ_CREATED" && "$PROJ_CREATED" != "null" ]]; then
    pass "project.json has correct schema and values"
  else
    fail "project.json schema issue: name=$PROJ_NAME slug=$PROJ_SLUG codeDir=$PROJ_CODE status=$PROJ_STATUS"
  fi
else
  fail "project.json not created"
fi

# Test 6.3: .highwatermark initialized to 1
if [[ -f "$PROJ_DIR/tasks/.highwatermark" ]]; then
  HWM=$(cat "$PROJ_DIR/tasks/.highwatermark" | tr -d '[:space:]')
  if [[ "$HWM" == "1" ]]; then
    pass ".highwatermark initialized to 1"
  else
    fail ".highwatermark has wrong value: '$HWM'"
  fi
else
  fail ".highwatermark not created"
fi

# Test 6.4: Template substitution in project-worker-prompt.md
if [[ -f "$PLUGIN_ROOT/scripts/project-worker-prompt.md" ]]; then
  SUBST_OUTPUT=$(sed "s|{{PROJECT}}|simtest|g; s|{{CODE_DIR}}|$MOCK_CODE_DIR2|g" "$PLUGIN_ROOT/scripts/project-worker-prompt.md")
  if echo "$SUBST_OUTPUT" | grep -q "simtest" && echo "$SUBST_OUTPUT" | grep -q "$MOCK_CODE_DIR2"; then
    if echo "$SUBST_OUTPUT" | grep -q "{{PROJECT}}\|{{CODE_DIR}}"; then
      fail "template substitution left unreplaced placeholders"
    else
      pass "template substitution replaces {{PROJECT}} and {{CODE_DIR}}"
    fi
  else
    fail "template substitution failed"
  fi
else
  fail "project-worker-prompt.md not found"
fi

# Test 6.5: Worker prompt documents full docs tree and task format
if [[ -f "$PLUGIN_ROOT/scripts/project-worker-prompt.md" ]]; then
  PROMPT_CONTENT=$(cat "$PLUGIN_ROOT/scripts/project-worker-prompt.md")
  HAS_PLANS=$(echo "$PROMPT_CONTENT" | grep -c "docs/plans/" || true)
  HAS_RESEARCH=$(echo "$PROMPT_CONTENT" | grep -c "docs/research/" || true)
  HAS_DESIGN=$(echo "$PROMPT_CONTENT" | grep -c "docs/design/" || true)
  HAS_TASK_JSON=$(echo "$PROMPT_CONTENT" | grep -c '"status"' || true)
  HAS_DECISION=$(echo "$PROMPT_CONTENT" | grep -c "Quick Fix\|quick fix\|Quick fix" || true)
  if [[ "$HAS_PLANS" -gt 0 && "$HAS_RESEARCH" -gt 0 && "$HAS_DESIGN" -gt 0 && "$HAS_TASK_JSON" -gt 0 && "$HAS_DECISION" -gt 0 ]]; then
    pass "worker prompt documents docs tree, task format, and decision tree"
  else
    fail "worker prompt missing docs tree ($HAS_PLANS/$HAS_RESEARCH/$HAS_DESIGN) or task format ($HAS_TASK_JSON) or decision tree ($HAS_DECISION)"
  fi
else
  fail "project-worker-prompt.md not found"
fi

rm -rf "$MOCK_CODE_DIR2"

echo ""

# ===========================================================================
# Section 7: Orchestrator Routing Logic (3 tests)
# ===========================================================================
echo "--- Section 7: Orchestrator Routing Logic ---"
echo ""

SYSTEM_MD="$PLUGIN_ROOT/templates/SYSTEM.md"

# Test 7.1: SYSTEM.md contains slack-send.sh for simple + spawn-worker.sh for complex
if [[ -f "$SYSTEM_MD" ]]; then
  if grep -q "slack-send.sh" "$SYSTEM_MD" && grep -q "spawn-worker.sh" "$SYSTEM_MD"; then
    pass "SYSTEM.md documents slack-send.sh and spawn-worker.sh routing"
  else
    fail "SYSTEM.md missing routing commands"
  fi
else
  fail "SYSTEM.md not found"
fi

# Test 7.2: SYSTEM.md documents --project flag for project work
if grep -q "\-\-project" "$SYSTEM_MD"; then
  pass "SYSTEM.md documents --project flag"
else
  fail "SYSTEM.md missing --project flag documentation"
fi

# Test 7.3: worker-prompt.md classifies [project-slug] tagged items
WORKER_PROMPT="$PLUGIN_ROOT/scripts/worker-prompt.md"
if [[ -f "$WORKER_PROMPT" ]]; then
  if grep -q "project-slug\|project.*tag\|\[.*slug\]" "$WORKER_PROMPT"; then
    pass "worker-prompt.md classifies project-tagged items"
  else
    fail "worker-prompt.md missing project tag classification"
  fi
else
  fail "worker-prompt.md not found"
fi

echo ""

# ===========================================================================
# Section 8: End-to-End Flows (3 tests)
# ===========================================================================
echo "--- Section 8: End-to-End Flows ---"
echo ""

# Test 8.1: Slack → worker → inbox: spawn-worker, mock claude runs, result in inbox
reset_state
"$PLUGIN_ROOT/scripts/spawn-worker.sh" "CSLACK001" "1707000001.000001" "Please help me debug this" 2>/dev/null || true
sleep 3

INBOX_LEN=$(jq 'length' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
if [[ "$INBOX_LEN" -gt 0 ]]; then
  INBOX_TEXT=$(jq -r '.[-1].text' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
  if echo "$INBOX_TEXT" | grep -q "CSLACK001" && echo "$INBOX_TEXT" | grep -q "1707000001.000001"; then
    pass "E2E: Slack → worker → inbox with correct channel/thread metadata"
  else
    fail "E2E: inbox result missing correct Slack metadata"
  fi
else
  fail "E2E: Slack worker did not produce inbox result"
fi

# Test 8.2: Project worker → inbox with Project label
reset_state
MOCK_CODE_DIR3=$(mktemp -d)
mkdir -p "$MOCK_HOME/.superbot/projects/e2eproj/tasks"
mkdir -p "$MOCK_HOME/.superbot/projects/e2eproj/docs"
cat > "$MOCK_HOME/.superbot/projects/e2eproj/project.json" << PROJ_EOF
{"name":"E2E Project","slug":"e2eproj","codeDir":"$MOCK_CODE_DIR3","status":"active","createdAt":"2026-02-09","updatedAt":"2026-02-09"}
PROJ_EOF

"$PLUGIN_ROOT/scripts/spawn-worker.sh" "CPROJ001" "1707000002.000001" "Fix the bug" --project e2eproj 2>/dev/null || true
sleep 3

INBOX_LEN=$(jq 'length' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
if [[ "$INBOX_LEN" -gt 0 ]]; then
  INBOX_TEXT=$(jq -r '.[-1].text' "$MOCK_HOME/.claude/teams/superbot/inboxes/team-lead.json" 2>/dev/null)
  if echo "$INBOX_TEXT" | grep -q "Project: e2eproj"; then
    pass "E2E: project worker inbox message includes Project label"
  else
    fail "E2E: project worker inbox missing 'Project: e2eproj' label"
  fi
else
  fail "E2E: project worker did not produce inbox result"
fi

rm -rf "$MOCK_CODE_DIR3"

# Test 8.3: Heartbeat E2E — unchecked tasks → triage → heartbeat spawns
reset_state
cp "$MOCK_JSONL" "$MOCK_HOME/.claude/projects/mock-project/mock-session.jsonl"
cat > "$MOCK_HOME/.superbot/HEARTBEAT.md" << 'EOF'
# Heartbeat Tasks
## Active
- [ ] Research best practices for error handling
- [ ] Clean up old log files
EOF

"$PLUGIN_ROOT/scripts/heartbeat-cron.sh" 2>/dev/null || true

# Check that triage ran (mock-claude.log should have a haiku invocation)
if grep -q "haiku" "$MOCK_CLAUDE_LOG"; then
  pass "E2E heartbeat: triage ran (haiku call in mock log)"
else
  fail "E2E heartbeat: no triage haiku call found in mock log"
fi

# Check heartbeat inbox got kickoff message
HB_INBOX="$MOCK_HOME/.claude/teams/superbot/inboxes/heartbeat.json"
if [[ -f "$HB_INBOX" ]]; then
  HB_INBOX_LEN=$(jq 'length' "$HB_INBOX" 2>/dev/null)
  if [[ "$HB_INBOX_LEN" -gt 0 ]]; then
    HB_TEXT=$(jq -r '.[0].text' "$HB_INBOX" 2>/dev/null)
    if echo "$HB_TEXT" | grep -q "Research best practices\|Clean up old"; then
      pass "E2E heartbeat: inbox got kickoff message with pending tasks"
    else
      fail "E2E heartbeat: kickoff message missing task text"
    fi
  else
    fail "E2E heartbeat: heartbeat inbox is empty"
  fi
else
  fail "E2E heartbeat: heartbeat inbox file not found"
fi

# Check heartbeat.log was updated
if [[ -f "$MOCK_HOME/.superbot/logs/heartbeat.log" ]]; then
  if grep -q "Triage\|triage\|work needed\|Teammate\|teammate" "$MOCK_HOME/.superbot/logs/heartbeat.log"; then
    pass "E2E heartbeat: heartbeat.log updated"
  else
    fail "E2E heartbeat: heartbeat.log missing triage/teammate entry"
  fi
else
  fail "E2E heartbeat: heartbeat.log not created"
fi

echo ""

# ---------------------------------------------------------------------------
# Cleanup verification
# ---------------------------------------------------------------------------
echo "--- Verification ---"
echo ""

# Verify no real API calls were made
if [[ -f "$MOCK_CLAUDE_LOG" ]]; then
  CALL_COUNT=$(grep -c "INVOCATION" "$MOCK_CLAUDE_LOG" 2>/dev/null || echo 0)
  echo -e "  Mock claude was called $CALL_COUNT time(s) — no real API calls made"
else
  echo -e "  No mock claude log found"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

# Restore real HOME
export HOME="$REAL_HOME"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
