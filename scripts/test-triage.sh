#!/bin/bash
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Testing triage with current HEARTBEAT.md..."
echo ""

if "$PLUGIN_ROOT/scripts/triage.sh"; then
  echo ""
  echo "Result: YES - work needed"
else
  echo ""
  echo "Result: NO - nothing to do"
fi
