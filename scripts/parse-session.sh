#!/bin/bash
# Parse a Claude Code session JSONL file, extracting only conversational content.
# Skips: file-history-snapshot, progress, queue-operation, tool_use blocks, tool_result content
# Usage: parse-session.sh <jsonl-file> [start-line]

set -e

JSONL_FILE="$1"
START_LINE="${2:-1}"

if [[ -z "$JSONL_FILE" || ! -f "$JSONL_FILE" ]]; then
  echo "Usage: parse-session.sh <jsonl-file> [start-line]" >&2
  exit 1
fi

# Stream from the given line offset, filter to conversational content only
tail -n +"$START_LINE" "$JSONL_FILE" | jq -r '
  # Skip non-message types
  select(.type == "user" or .type == "assistant") |

  # Extract timestamp
  .timestamp as $ts |

  if .type == "user" then
    # User messages: extract text content only (skip tool_result blocks)
    if (.message.content | type) == "string" then
      "[\($ts)] USER: \(.message.content)"
    elif (.message.content | type) == "array" then
      # Filter to only text blocks (skip tool_result)
      [.message.content[] | select(.type == "text") | .text] |
      if length > 0 then
        "[\($ts)] USER: \(join("\n"))"
      else
        empty
      end
    else
      empty
    end

  elif .type == "assistant" then
    # Assistant messages: extract only text blocks (skip tool_use)
    if (.message.content | type) == "array" then
      [.message.content[] | select(.type == "text") | .text] |
      if length > 0 then
        "[\($ts)] ASSISTANT: \(join("\n"))"
      else
        empty
      end
    elif (.message.content | type) == "string" then
      "[\($ts)] ASSISTANT: \(.message.content)"
    else
      empty
    end

  else
    empty
  end
' 2>/dev/null
