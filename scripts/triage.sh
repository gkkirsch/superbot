#!/bin/bash
export PATH="$HOME/.local/bin:$HOME/.asdf/shims:$HOME/.asdf/bin:$PATH"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.superbot"

# Check if heartbeat file exists
if [[ ! -f "$DIR/HEARTBEAT.md" ]]; then
  exit 1
fi

# Quick model check - exit 0 if work needed, exit 1 if not
response=$(claude -p "$(cat "$PLUGIN_ROOT/scripts/triage-prompt.md")

Current tasks:
$(cat "$DIR/HEARTBEAT.md")" --model haiku 2>/dev/null)

[[ "$response" == *"YES"* ]] && exit 0 || exit 1
