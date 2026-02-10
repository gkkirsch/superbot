#!/bin/bash
set -e

DIR="$HOME/.superbot"
TEAM_DIR="$HOME/.claude/teams/superbot"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Setting up superbot..."
echo ""

# --- Check for Claude Code ---

if ! command -v claude &>/dev/null; then
  # Check common install locations not yet in PATH
  for candidate in "$HOME/.claude/local/bin/claude" "$HOME/.local/bin/claude" "/usr/local/bin/claude"; do
    if [[ -x "$candidate" ]]; then
      export PATH="$(dirname "$candidate"):$PATH"
      break
    fi
  done
fi

if ! command -v claude &>/dev/null; then
  echo "Claude Code is not installed."
  echo ""
  read -p "Would you like to install it now? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing Claude Code..."
    curl -fsSL https://claude.ai/install.sh | bash
    echo ""

    # Add common install locations to PATH for this session
    for candidate in "$HOME/.claude/local/bin/claude" "$HOME/.local/bin/claude" "/usr/local/bin/claude"; do
      if [[ -x "$candidate" ]]; then
        export PATH="$(dirname "$candidate"):$PATH"
        break
      fi
    done

    # Verify it worked
    if ! command -v claude &>/dev/null; then
      echo "Installation finished but 'claude' command not found in current shell."
      echo "You may need to restart your terminal, then re-run this script."
      exit 1
    fi
    echo "Claude Code installed successfully."
  else
    echo "Superbot requires Claude Code. Install it manually:"
    echo "  curl -fsSL https://claude.ai/install.sh | bash"
    exit 1
  fi
  echo ""
fi

# Create superbot directories
mkdir -p "$DIR"
mkdir -p "$DIR/daily"
mkdir -p "$DIR/projects"
mkdir -p "$DIR/prompts"
mkdir -p "$DIR/logs"

# Create team directories
mkdir -p "$TEAM_DIR/inboxes"

# Copy templates (don't overwrite existing)
for file in IDENTITY USER MEMORY HEARTBEAT ONBOARD; do
  if [[ ! -f "$DIR/$file.md" ]]; then
    cp "$PLUGIN_ROOT/templates/$file.md" "$DIR/$file.md"
    echo "Created $file.md"
  else
    echo "Skipped $file.md (already exists)"
  fi
done

# Copy config (don't overwrite existing)
if [[ ! -f "$DIR/config.json" ]]; then
  cp "$PLUGIN_ROOT/config.template.json" "$DIR/config.json"
  echo "Created config.json from template"
else
  echo "Skipped config.json (already exists)"
fi

# Migrate old slack-config.json into config.json if present
OLD_SLACK_CONFIG="$DIR/slack-config.json"
if [[ -f "$OLD_SLACK_CONFIG" ]]; then
  OLD_BOT=$(jq -r '.botToken // ""' "$OLD_SLACK_CONFIG")
  OLD_APP=$(jq -r '.appToken // ""' "$OLD_SLACK_CONFIG")
  CURRENT_BOT=$(jq -r '.slack.botToken // ""' "$DIR/config.json")
  if [[ -n "$OLD_BOT" && -z "$CURRENT_BOT" ]]; then
    jq --arg bot "$OLD_BOT" --arg app "$OLD_APP" \
      '.slack.botToken = $bot | .slack.appToken = $app' \
      "$DIR/config.json" > "$DIR/config.json.tmp" \
      && mv "$DIR/config.json.tmp" "$DIR/config.json"
    echo "Migrated Slack tokens from slack-config.json into config.json"
  fi
fi

# Migrate old schedule.json into config.json if present
OLD_SCHEDULE="$DIR/schedule.json"
if [[ -f "$OLD_SCHEDULE" ]]; then
  CURRENT_SCHEDULE=$(jq -r '.schedule | length' "$DIR/config.json")
  if [[ "$CURRENT_SCHEDULE" == "0" ]]; then
    SCHEDULE_DATA=$(cat "$OLD_SCHEDULE")
    jq --argjson sched "$SCHEDULE_DATA" '.schedule = $sched' \
      "$DIR/config.json" > "$DIR/config.json.tmp" \
      && mv "$DIR/config.json.tmp" "$DIR/config.json"
    echo "Migrated schedule from schedule.json into config.json"
  fi
fi

# Create projects directory from config
PROJECTS_DIR=$(jq -r '.projectsDir // "~/projects"' "$DIR/config.json" | sed "s|^~|$HOME|")
mkdir -p "$PROJECTS_DIR"
echo "Projects directory: $PROJECTS_DIR"

# Create sessions registry
if [[ ! -f "$DIR/sessions.json" ]]; then
  echo '{"sessions":[]}' > "$DIR/sessions.json"
  echo "Created sessions.json"
else
  echo "Skipped sessions.json (already exists)"
fi

# Create log file
touch "$DIR/logs/heartbeat.log"

# --- Agent Teams scaffolding ---

# Generate a fixed session ID for the team lead (once, reused forever)
if [[ -f "$TEAM_DIR/config.json" ]]; then
  LEAD_SESSION=$(jq -r '.leadSessionId' "$TEAM_DIR/config.json" 2>/dev/null)
  echo "Team config exists (leadSessionId: $LEAD_SESSION)"
else
  LEAD_SESSION=$(uuidgen | tr '[:upper:]' '[:lower:]')
  NOW_MS=$(date +%s)000
  cat > "$TEAM_DIR/config.json" <<TEAMCFG
{
  "name": "superbot",
  "description": "Superbot — team-lead orchestrates workers and heartbeat",
  "createdAt": $NOW_MS,
  "leadAgentId": "team-lead@superbot",
  "leadSessionId": "$LEAD_SESSION",
  "members": [
    {
      "agentId": "team-lead@superbot",
      "name": "team-lead",
      "agentType": "team-lead",
      "joinedAt": $NOW_MS,
      "cwd": "$HOME/dev",
      "subscriptions": []
    }
  ]
}
TEAMCFG
  echo "Created team config (leadSessionId: $LEAD_SESSION)"
fi

# Create empty inbox files if they don't exist
for inbox in team-lead heartbeat; do
  if [[ ! -f "$TEAM_DIR/inboxes/$inbox.json" ]]; then
    echo "[]" > "$TEAM_DIR/inboxes/$inbox.json"
    echo "Created inbox: $inbox.json"
  fi
done

# Install built-in skills (don't overwrite if customized)
SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"
for skill_dir in "$PLUGIN_ROOT"/skills/*/; do
  skill_name="$(basename "$skill_dir")"
  if [[ ! -d "$SKILLS_DIR/$skill_name" ]]; then
    cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
    echo "Installed skill: $skill_name"
  else
    echo "Skipped skill: $skill_name (already exists)"
  fi
done

# --- Install agent-browser (Vercel browser automation for AI agents) ---
if command -v agent-browser &>/dev/null; then
  echo "agent-browser already installed"
else
  echo "Installing agent-browser..."
  npm install -g agent-browser
  agent-browser install
  echo "agent-browser installed"
fi

# Install agent-browser skill
if [[ -d "$HOME/.claude/skills/agent-browser" ]]; then
  echo "Skipped agent-browser skill (already exists)"
else
  echo "Installing agent-browser skill..."
  npx skills add vercel-labs/agent-browser@agent-browser -g -a claude-code -y
  echo "Installed agent-browser skill"
fi

# --- Install Claude Code plugins ---

# Add marketplaces
echo ""
echo "Setting up plugin marketplaces..."

# Check if anthropics/claude-code marketplace is available
if claude plugin marketplace list 2>/dev/null | grep -q "claude-code"; then
  echo "anthropics/claude-code marketplace already configured"
else
  echo "Adding anthropics/claude-code marketplace..."
  claude plugin marketplace add anthropics/claude-code 2>/dev/null || echo "Warning: could not add anthropics/claude-code marketplace"
fi

# Check if superpowers-marketplace is available
if claude plugin marketplace list 2>/dev/null | grep -q "superpowers-marketplace"; then
  echo "superpowers-marketplace already configured"
else
  echo "Adding superpowers-marketplace..."
  claude plugin marketplace add obra/superpowers-marketplace 2>/dev/null || echo "Warning: could not add superpowers-marketplace"
fi

# Install superpowers from its official marketplace
if claude plugin list 2>/dev/null | grep -q "superpowers"; then
  echo "Plugin already installed: superpowers"
else
  echo "Installing plugin: superpowers..."
  claude plugin install "superpowers@superpowers-marketplace" 2>/dev/null || echo "Warning: could not install superpowers plugin"
fi

# Install feature-dev from anthropics marketplace
if claude plugin list 2>/dev/null | grep -q "feature-dev"; then
  echo "Plugin already installed: feature-dev"
else
  echo "Installing plugin: feature-dev..."
  claude plugin install "feature-dev" 2>/dev/null || echo "Warning: could not install feature-dev plugin"
fi

# Copy teammate prompt to prompts directory (don't overwrite if customized)
if [[ ! -f "$DIR/prompts/heartbeat.md" ]]; then
  cp "$PLUGIN_ROOT/scripts/worker-prompt.md" "$DIR/prompts/heartbeat.md"
  echo "Created heartbeat.md in prompts directory"
else
  echo "Skipped prompts/heartbeat.md (already customized)"
fi

# --- Shell profile setup ---

SHELL_PROFILE=""
if [[ -n "$ZSH_VERSION" ]] || [[ "$SHELL" == */zsh ]]; then
  SHELL_PROFILE="$HOME/.zshrc"
elif [[ -n "$BASH_VERSION" ]] || [[ "$SHELL" == */bash ]]; then
  SHELL_PROFILE="$HOME/.bashrc"
fi

if [[ -n "$SHELL_PROFILE" ]]; then
  # Agent Teams env var
  if ! grep -q "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" "$SHELL_PROFILE" 2>/dev/null; then
    echo "" >> "$SHELL_PROFILE"
    echo "# Superbot: Enable Claude Code Agent Teams" >> "$SHELL_PROFILE"
    echo "export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" >> "$SHELL_PROFILE"
    echo "Added CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 to $SHELL_PROFILE"
  else
    echo "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS already set in $SHELL_PROFILE"
  fi

  # Superbot alias
  if ! grep -q "alias superbot=" "$SHELL_PROFILE" 2>/dev/null; then
    echo "" >> "$SHELL_PROFILE"
    echo "# Superbot" >> "$SHELL_PROFILE"
    echo "alias superbot=\"$PLUGIN_ROOT/superbot\"" >> "$SHELL_PROFILE"
    echo "Added superbot alias to $SHELL_PROFILE"
  else
    echo "superbot alias already exists in $SHELL_PROFILE"
  fi
else
  echo "Warning: Could not detect shell profile. Manually add:"
  echo "  export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
  echo "  alias superbot=\"$PLUGIN_ROOT/superbot\""
fi

# Export for this session (sourcing zshrc from bash breaks Oh My Zsh)
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Show Claude Code version
echo ""
INSTALLED=$(claude --version 2>/dev/null | head -1)
echo "Claude Code: $INSTALLED"

echo ""
echo "Setup complete!"
echo "Files created in: $DIR"
echo "Team config in: $TEAM_DIR"
echo ""

# Launch superbot with onboarding
echo "Launching onboarding..."
echo ""
exec "$PLUGIN_ROOT/superbot" "/superbot:onboard"
