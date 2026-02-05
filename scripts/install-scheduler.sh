#!/bin/bash
set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.claude.superbot-scheduler.plist"

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
