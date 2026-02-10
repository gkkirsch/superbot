#!/bin/bash
set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.claude.superbot-scheduler.plist"

# Resolve node's real binary path and save it for LaunchAgent scripts.
# LaunchAgents run in a minimal environment without the user's shell profile,
# so we capture the real node location now while we have access to it.
# Handles: Homebrew (ARM + Intel), asdf, nvm, volta, fnm, system installs.
REAL_NODE=""
if command -v asdf &>/dev/null; then
  REAL_NODE=$(asdf which node 2>/dev/null)
elif command -v volta &>/dev/null; then
  REAL_NODE=$(volta which node 2>/dev/null)
elif command -v fnm &>/dev/null; then
  REAL_NODE=$(fnm exec --using=default -- which node 2>/dev/null)
fi
if [[ -z "$REAL_NODE" ]]; then
  NODE_BIN=$(command -v node 2>/dev/null)
  [[ -n "$NODE_BIN" ]] && REAL_NODE=$(readlink -f "$NODE_BIN" 2>/dev/null || realpath "$NODE_BIN" 2>/dev/null || echo "$NODE_BIN")
fi
if [[ -n "$REAL_NODE" ]]; then
  echo "$(dirname "$REAL_NODE")" > "$HOME/.superbot/.node-path"
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.superbot-scheduler</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PLUGIN_ROOT/scripts/scheduler.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>60</integer>
    <key>StandardOutPath</key>
    <string>$HOME/.superbot/logs/scheduler-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.superbot/logs/scheduler-stderr.log</string>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl load "$PLIST"

echo "Scheduler installed!"
echo "  Checks every 60 seconds"
echo "  Config: schedule array in config.json"
echo "  Log: ~/.superbot/logs/scheduler.log"
echo "  Plist: $PLIST"
