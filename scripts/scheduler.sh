#!/bin/bash
export PATH="$HOME/.local/bin:$HOME/.asdf/shims:$HOME/.asdf/bin:$PATH"
DIR="$HOME/.superbot"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$HOME/.superbot/config.json"
LAST_RUN="$DIR/schedule-last-run.json"
LOG="$DIR/logs/scheduler.log"

# Exit silently if no config
[[ ! -f "$CONFIG" ]] && exit 0

# Read scheduler model from config (default: opus)
export SCHEDULER_MODEL="opus"
MODEL_FROM_CONFIG=$(jq -r '.scheduler.model // .defaultModel // "opus"' "$CONFIG")
[[ -n "$MODEL_FROM_CONFIG" && "$MODEL_FROM_CONFIG" != "null" ]] && export SCHEDULER_MODEL="$MODEL_FROM_CONFIG"

# Extract schedule array to temp file for processing
SCHEDULE_DATA=$(jq -r '.schedule // []' "$CONFIG")
[[ "$SCHEDULE_DATA" == "[]" ]] && exit 0

SCHEDULE=$(mktemp)
echo "$SCHEDULE_DATA" > "$SCHEDULE"
trap "rm -f $SCHEDULE" EXIT

# Ensure last-run tracker exists
[[ ! -f "$LAST_RUN" ]] && echo '{}' > "$LAST_RUN"

NOW_HOUR=$(date '+%H')
NOW_MIN=$(date '+%M')
NOW_DAY=$(date '+%a' | tr '[:upper:]' '[:lower:]')
NOW_DATE=$(date '+%Y-%m-%d')

# Find due jobs, update last-run tracker, output JSON array of due jobs
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
" "$SCHEDULE" "$LAST_RUN" "$NOW_HOUR" "$NOW_MIN" "$NOW_DAY" "$NOW_DATE" 2>> "$LOG")

[[ -z "$RESULT" ]] && exit 0

# Run each due job directly
node -e "
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const due = JSON.parse(process.argv[1]);
const dir = process.argv[2];
const log = process.argv[3];
const claudeBin = path.join(os.homedir(), '.local', 'bin', 'claude');

// Read context files for the worker
const readFile = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch(_) { return ''; } };
const identity = readFile(path.join(dir, 'IDENTITY.md'));
const user = readFile(path.join(dir, 'USER.md'));
const memory = readFile(path.join(dir, 'MEMORY.md'));

const context = [identity, user, memory].filter(Boolean).join('\n---\n');
const ts = new Date().toISOString().replace('T', ' ').slice(0, 16);

for (const job of due) {
  const prompt = [
    '<superbot-context>',
    context,
    '</superbot-context>',
    '',
    'You are running a scheduled job: ' + job.name,
    'Task: ' + job.task,
  ].join('\n');

  fs.appendFileSync(log, ts + ' - Running: ' + job.name + '\n');

  try {
    const output = execSync(
      [claudeBin, '-p', JSON.stringify(prompt), '--model', process.env.SCHEDULER_MODEL || 'opus', '--permission-mode', 'bypassPermissions'].join(' '),
      { timeout: 300000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    fs.appendFileSync(log, ts + ' - Completed: ' + job.name + '\n');
  } catch (err) {
    fs.appendFileSync(log, ts + ' - Failed: ' + job.name + ' - ' + (err.message || '').slice(0, 200) + '\n');
  }
}
" "$RESULT" "$DIR" "$LOG" 2>> "$LOG"
