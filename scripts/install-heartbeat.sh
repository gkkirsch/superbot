#!/bin/bash
set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$HOME/.superbot/config.json"
PLIST="$HOME/Library/LaunchAgents/com.claude.superbot-heartbeat.plist"

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
# Fallback: resolve whatever `node` points to
if [[ -z "$REAL_NODE" ]]; then
  NODE_BIN=$(command -v node 2>/dev/null)
  [[ -n "$NODE_BIN" ]] && REAL_NODE=$(readlink -f "$NODE_BIN" 2>/dev/null || realpath "$NODE_BIN" 2>/dev/null || echo "$NODE_BIN")
fi
if [[ -n "$REAL_NODE" ]]; then
  NODE_DIR=$(dirname "$REAL_NODE")
  echo "$NODE_DIR" > "$HOME/.superbot/.node-path"
  echo "  Node found at: $NODE_DIR"
else
  echo "  Warning: node not found in PATH. Background scripts may not work."
fi

# Read interval from config.json (default: 30 minutes)
INTERVAL_MIN=30
if [[ -f "$CONFIG" ]]; then
  FROM_CONFIG=$(jq -r '.heartbeat.intervalMinutes // 30' "$CONFIG")
  [[ -n "$FROM_CONFIG" && "$FROM_CONFIG" != "null" ]] && INTERVAL_MIN="$FROM_CONFIG"
fi
INTERVAL_SEC=$((INTERVAL_MIN * 60))

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.superbot-heartbeat</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PLUGIN_ROOT/scripts/heartbeat-cron.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>$INTERVAL_SEC</integer>
    <key>StandardOutPath</key>
    <string>$HOME/.superbot/logs/heartbeat-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.superbot/logs/heartbeat-stderr.log</string>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl load "$PLIST"

echo "Heartbeat installed!"
echo "  Running every $INTERVAL_MIN minutes"
echo "  Plist: $PLIST"
echo ""
echo "To change interval, update heartbeat.intervalMinutes in config.json"
echo "and re-run this script."
