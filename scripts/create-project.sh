#!/bin/bash
# create-project.sh — Initialize a new project with templates
# Usage: create-project.sh <slug> "<name>" [code-dir] [description]
#
# Creates:
#   ~/.superbot/projects/<slug>/
#     project.json, PLAN.md, README.md, tasks/, tasks/.highwatermark, docs/
#
# Examples:
#   create-project.sh prompt-research "Prompt Research" "" "Research into prompt architecture"
#   create-project.sh summary "Summary App" ~/dev/summary "Bird summary web app"
#   create-project.sh nikole "Nikole Site" ~/dev/nikole

set -e

PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECTS_DIR="$HOME/.superbot/projects"

SLUG="$1"
NAME="$2"
CODE_DIR="${3:-}"
DESC="${4:-}"

if [[ -z "$SLUG" || -z "$NAME" ]]; then
  echo "Usage: create-project.sh <slug> <name> [code-dir] [description]" >&2
  exit 1
fi

PROJECT_DIR="$PROJECTS_DIR/$SLUG"

if [[ -d "$PROJECT_DIR" ]]; then
  echo "Error: project '$SLUG' already exists at $PROJECT_DIR" >&2
  exit 1
fi

# Expand ~ in code dir if provided
[[ -n "$CODE_DIR" ]] && CODE_DIR="${CODE_DIR/#\~/$HOME}"

# Create directory structure
mkdir -p "$PROJECT_DIR/tasks"
mkdir -p "$PROJECT_DIR/docs"

# Copy templates
cp "$PLUGIN_ROOT/templates/project.template.json" "$PROJECT_DIR/project.json"
cp "$PLUGIN_ROOT/templates/PROJECT_PLAN.md" "$PROJECT_DIR/PLAN.md"
cp "$PLUGIN_ROOT/templates/PROJECT_README.md" "$PROJECT_DIR/README.md"

# Initialize task counter
echo "1" > "$PROJECT_DIR/tasks/.highwatermark"

# Fill in project.json
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
jq --arg name "$NAME" \
   --arg slug "$SLUG" \
   --arg desc "$DESC" \
   --arg code "$CODE_DIR" \
   --arg now "$NOW" \
   '.name=$name | .slug=$slug | .description=$desc | .codeDir=$code | .createdAt=$now | .updatedAt=$now' \
   "$PROJECT_DIR/project.json" > /tmp/proj.tmp && mv /tmp/proj.tmp "$PROJECT_DIR/project.json"

echo "$PROJECT_DIR"
