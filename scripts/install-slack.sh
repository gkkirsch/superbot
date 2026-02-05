#!/bin/bash
set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.claude.superbot-slack.plist"
CONFIG="$HOME/.superbot/config.json"

# Prerequisites
if ! command -v node &>/dev/null; then
  echo "Error: node not found. Install Node.js first."
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "Error: $CONFIG not found. Run setup first."
  exit 1
fi

# Verify Slack tokens are configured
BOT_TOKEN=$(jq -r '.slack.botToken // ""' "$CONFIG")
if [[ -z "$BOT_TOKEN" ]]; then
  echo "Error: slack.botToken not set in config.json."
  echo "Run /slack-setup to configure the Slack bot first."
  exit 1
fi

if [[ ! -d "$PLUGIN_ROOT/node_modules" ]]; then
  echo "Error: node_modules not found. Run 'npm install' in $PLUGIN_ROOT first."
  exit 1
fi

# Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# Unload existing if present
if [[ -f "$PLIST" ]]; then
  launchctl unload "$PLIST" 2>/dev/null || true
fi

cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.superbot-slack</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$PLUGIN_ROOT/scripts/slack-bot.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PLUGIN_ROOT</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/.superbot/logs/slack-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.superbot/logs/slack-stderr.log</string>
</dict>
</plist>
EOF

# Use the actual node path for this system
NODE_PATH="$(which node)"
sed -i '' "s|/usr/local/bin/node|$NODE_PATH|" "$PLIST"

launchctl load "$PLIST"

echo "Slack bot daemon installed."
echo "  Plist: $PLIST"
echo "  Logs:  ~/.superbot/logs/slack-stdout.log"
echo "  Stop:  launchctl unload $PLIST"
