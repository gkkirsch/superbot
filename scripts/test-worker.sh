#!/bin/bash
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Running worker in dry-run mode..."
echo "(Will show what would happen without making changes)"
echo ""

claude -p "$(cat "$PLUGIN_ROOT/scripts/worker-prompt.md")

IMPORTANT: This is a TEST RUN. Describe what you would do but don't actually modify any files." --allowedTools "Read"
