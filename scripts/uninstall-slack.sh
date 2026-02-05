#!/bin/bash
PLIST="$HOME/Library/LaunchAgents/com.claude.superbot-slack.plist"

if [[ -f "$PLIST" ]]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm "$PLIST"
  echo "Slack bot daemon uninstalled."
else
  echo "Slack bot daemon not installed."
fi
