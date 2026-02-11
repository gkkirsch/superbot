#!/bin/bash
# create-space.sh — Initialize a new space with templates
# Usage: create-space.sh <slug> "<name>" [code-dir] [description]
#
# Creates:
#   ~/.superbot/spaces/<slug>/
#     space.json, OVERVIEW.md, tasks/, tasks/.highwatermark, docs/
#
# Examples:
#   create-space.sh prompt-research "Prompt Research" "" "Research into prompt architecture"
#   create-space.sh summary "Summary App" ~/dev/summary "Bird summary web app"
#   create-space.sh nikole "Nikole Site" ~/dev/nikole

set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPACES_DIR="$HOME/.superbot/spaces"

SLUG="$1"
NAME="$2"
CODE_DIR="${3:-}"
DESC="${4:-}"

if [[ -z "$SLUG" || -z "$NAME" ]]; then
  echo "Usage: create-space.sh <slug> <name> [code-dir] [description]" >&2
  exit 1
fi

SPACE_DIR="$SPACES_DIR/$SLUG"

if [[ -d "$SPACE_DIR" ]]; then
  echo "Error: space '$SLUG' already exists at $SPACE_DIR" >&2
  exit 1
fi

# Expand ~ in code dir if provided
[[ -n "$CODE_DIR" ]] && CODE_DIR="${CODE_DIR/#\~/$HOME}"

# Create directory structure
mkdir -p "$SPACE_DIR/tasks"
mkdir -p "$SPACE_DIR/docs"

# Copy templates
cp "$PLUGIN_ROOT/templates/space.template.json" "$SPACE_DIR/space.json"
cp "$PLUGIN_ROOT/templates/SPACE_OVERVIEW.md" "$SPACE_DIR/OVERVIEW.md"

# Initialize task counter
echo "1" > "$SPACE_DIR/tasks/.highwatermark"

# Fill in space.json
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq --arg name "$NAME" \
   --arg slug "$SLUG" \
   --arg desc "$DESC" \
   --arg code "$CODE_DIR" \
   --arg now "$NOW" \
   '.name=$name | .slug=$slug | .description=$desc | .codeDir=$code | .createdAt=$now | .updatedAt=$now' \
   "$SPACE_DIR/space.json" > /tmp/space.tmp && mv /tmp/space.tmp "$SPACE_DIR/space.json"

echo "$SPACE_DIR"
