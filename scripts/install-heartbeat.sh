#!/bin/bash
set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$HOME/.superbot/config.json"
PLIST="$HOME/Library/LaunchAgents/com.claude.superbot-heartbeat.plist"

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
