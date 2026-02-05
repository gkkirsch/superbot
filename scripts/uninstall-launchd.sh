#!/bin/bash
PLIST="$HOME/Library/LaunchAgents/com.claude.superbot-heartbeat.plist"

if [[ -f "$PLIST" ]]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm "$PLIST"
  echo "Heartbeat uninstalled."
else
  echo "Heartbeat not installed."
fi
