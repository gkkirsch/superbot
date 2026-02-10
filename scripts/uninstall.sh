#!/bin/bash
# Superbot full uninstaller
# Removes all superbot state, background services, skills, and shell config

set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$HOME/.superbot"
TEAM_DIR="$HOME/.claude/teams/superbot"
SKILLS_DIR="$HOME/.claude/skills"

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║      Uninstalling Superbot    ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# --- Stop and remove launchd services ---

echo "Removing background services..."

for plist in \
  "$HOME/Library/LaunchAgents/com.claude.superbot-heartbeat.plist" \
  "$HOME/Library/LaunchAgents/com.claude.superbot-scheduler.plist" \
  "$HOME/Library/LaunchAgents/com.claude.superbot-slack.plist"; do
  if [[ -f "$plist" ]]; then
    launchctl unload "$plist" 2>/dev/null || true
    rm "$plist"
    echo "  Removed $(basename "$plist")"
  fi
done

# --- Remove superbot state ---

if [[ -d "$DIR" ]]; then
  echo ""
  echo "Removing superbot state ($DIR)..."
  rm -rf "$DIR"
  echo "  Removed $DIR"
fi

# --- Remove team files ---

if [[ -d "$TEAM_DIR" ]]; then
  echo ""
  echo "Removing team config ($TEAM_DIR)..."
  rm -rf "$TEAM_DIR"
  echo "  Removed $TEAM_DIR"
fi

# --- Remove bundled skills ---

echo ""
echo "Removing superbot skills..."

# Only remove skills that superbot installs (from its own skills/ dir)
for skill_dir in "$PLUGIN_ROOT"/skills/*/; do
  skill_name="$(basename "$skill_dir")"
  if [[ -d "$SKILLS_DIR/$skill_name" ]]; then
    rm -rf "$SKILLS_DIR/$skill_name"
    echo "  Removed skill: $skill_name"
  fi
done

# Also remove skills installed by setup.sh
for extra_skill in daily heartbeat twitter-reader; do
  if [[ -d "$SKILLS_DIR/$extra_skill" ]]; then
    rm -rf "$SKILLS_DIR/$extra_skill"
    echo "  Removed skill: $extra_skill"
  fi
done

# --- Clean shell profile ---

echo ""
echo "Cleaning shell profile..."

SHELL_PROFILE=""
if [[ -n "$ZSH_VERSION" ]] || [[ "$SHELL" == */zsh ]]; then
  SHELL_PROFILE="$HOME/.zshrc"
elif [[ -n "$BASH_VERSION" ]] || [[ "$SHELL" == */bash ]]; then
  SHELL_PROFILE="$HOME/.bashrc"
fi

if [[ -n "$SHELL_PROFILE" && -f "$SHELL_PROFILE" ]]; then
  # Remove superbot alias and AGENT_TEAMS env var (and their comment lines)
  TMPFILE=$(mktemp)
  grep -v -E '# Superbot|alias superbot=|CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS' "$SHELL_PROFILE" > "$TMPFILE"
  mv "$TMPFILE" "$SHELL_PROFILE"
  echo "  Cleaned $SHELL_PROFILE"
else
  echo "  Shell profile not found — check manually for superbot entries"
fi

echo ""
echo "Uninstall complete!"
echo ""
echo "The plugin directory ($PLUGIN_ROOT) was NOT removed."
echo "To fully remove it: rm -rf $PLUGIN_ROOT"
