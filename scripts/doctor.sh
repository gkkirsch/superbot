#!/bin/bash
DIR="$HOME/.superbot"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

echo "=== Superbot Diagnostics ==="
echo ""

# Check Claude CLI
echo -n "Claude CLI: "
if command -v claude &>/dev/null; then
  echo "✓ found at $(which claude)"
else
  echo "✗ not found in PATH"
  ((ERRORS++))
fi

# Check Claude Code version
echo -n "Claude Code version: "
if command -v claude &>/dev/null; then
  INSTALLED=$(claude --version 2>/dev/null | head -1)
  LATEST=$(npm show @anthropic-ai/claude-code version 2>/dev/null)
  if [[ -n "$LATEST" && "$INSTALLED" != *"$LATEST"* ]]; then
    echo "⚠ $INSTALLED (latest: $LATEST) — run: claude update"
  else
    echo "✓ $INSTALLED (up to date)"
  fi
else
  echo "✗ claude not installed"
  ((ERRORS++))
fi

# Check auth
echo -n "Claude auth: "
if claude --version &>/dev/null; then
  echo "✓ working"
else
  echo "✗ not authenticated or error"
  ((ERRORS++))
fi

# Check Agent Teams env var
echo -n "Agent Teams: "
if [[ "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS}" == "1" ]]; then
  echo "✓ enabled"
else
  echo "✗ CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS not set — run setup.sh or add 'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' to your shell profile"
  ((ERRORS++))
fi

# Check directory
echo -n "Config directory: "
if [[ -d "$DIR" ]]; then
  echo "✓ $DIR"
else
  echo "✗ missing - run setup.sh"
  ((ERRORS++))
fi

# Check files
for file in IDENTITY USER MEMORY HEARTBEAT; do
  echo -n "$file.md: "
  if [[ -f "$DIR/$file.md" ]]; then
    if [[ -r "$DIR/$file.md" ]]; then
      echo "✓ exists and readable"
    else
      echo "✗ exists but not readable"
      ((ERRORS++))
    fi
  else
    echo "✗ missing"
    ((ERRORS++))
  fi
done

# Check scripts executable
echo -n "Scripts executable: "
if [[ -x "$PLUGIN_ROOT/scripts/heartbeat-cron.sh" ]]; then
  echo "✓"
else
  echo "✗ run: chmod +x $PLUGIN_ROOT/scripts/*.sh"
  ((ERRORS++))
fi

# Check launchd
echo -n "Scheduler: "
if launchctl list 2>/dev/null | grep -q "com.claude.superbot-heartbeat"; then
  echo "✓ running"
else
  echo "○ not installed (optional)"
fi

# Summary
echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo "All checks passed ✓"
else
  echo "$ERRORS issue(s) found"
  exit 1
fi
