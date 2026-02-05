#!/bin/bash
# slack-send.sh — Post a message to Slack from superbot
# Usage: slack-send.sh <channel> <message> [thread_ts]
#
# Examples:
#   slack-send.sh C0123ABCDEF "Hello from superbot!"
#   slack-send.sh C0123ABCDEF "Thread reply" 1234567890.123456

CONFIG="$HOME/.superbot/config.json"

if [[ ! -f "$CONFIG" ]]; then
  echo "Error: config.json not found. Run setup first." >&2
  exit 1
fi

CHANNEL="$1"
MESSAGE="${2//\\!/!}"
THREAD_TS="$3"

if [[ -z "$CHANNEL" || -z "$MESSAGE" ]]; then
  echo "Usage: slack-send.sh <channel> <message> [thread_ts]" >&2
  exit 1
fi

BOT_TOKEN=$(jq -r '.slack.botToken' "$CONFIG")

if [[ -z "$BOT_TOKEN" || "$BOT_TOKEN" == "null" ]]; then
  echo "Error: slack.botToken not found in config.json" >&2
  exit 1
fi

# Build JSON payload
PAYLOAD=$(jq -n \
  --arg channel "$CHANNEL" \
  --arg text "$MESSAGE" \
  '{channel: $channel, text: $text}')

if [[ -n "$THREAD_TS" ]]; then
  PAYLOAD=$(echo "$PAYLOAD" | jq --arg ts "$THREAD_TS" '. + {thread_ts: $ts}')
fi

# Post to Slack
RESPONSE=$(curl -s -X POST "https://slack.com/api/chat.postMessage" \
  -H "Authorization: Bearer $BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

OK=$(echo "$RESPONSE" | jq -r '.ok')
if [[ "$OK" == "true" ]]; then
  TS=$(echo "$RESPONSE" | jq -r '.ts')
  echo "$TS"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo "Error: $ERROR" >&2
  exit 1
fi
