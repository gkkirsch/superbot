#!/bin/bash
# Load node path resolved at install time (works across all node managers)
[[ -f "$HOME/.superbot/.node-path" ]] && export PATH="$(cat "$HOME/.superbot/.node-path"):$PATH"
export PATH="$HOME/.local/bin:$HOME/.asdf/shims:$HOME/.asdf/bin:$PATH"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.superbot"

# Check if heartbeat file exists
if [[ ! -f "$DIR/HEARTBEAT.md" ]]; then
  exit 1
fi

HEARTBEAT="$DIR/HEARTBEAT.md"

# Fast path: if there are unchecked work items, always trigger
if grep -q '^\- \[ \]' "$HEARTBEAT" 2>/dev/null; then
  exit 0
fi

# Fast path: if there are recurring checks (non-empty lines under ## Recurring Checks), always trigger
RECURRING=$(sed -n '/^## Recurring Checks/,/^## /{ /^- /p; }' "$HEARTBEAT" 2>/dev/null)
if [[ -n "$RECURRING" ]]; then
  exit 0
fi

# Nothing found
exit 1
