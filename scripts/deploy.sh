#!/bin/bash
# deploy.sh — Sync dev copy to the installed plugin directory
# Usage: bash scripts/deploy.sh [--symlink]
#
# Default: rsync files from ~/dev/superbot to ~/.superbot-plugin
# --symlink: Replace ~/.superbot-plugin with a symlink to this repo (dev mode)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_DIR="$HOME/.superbot-plugin"

if [[ "${1:-}" == "--symlink" ]]; then
  echo "Switching to symlink mode..."
  if [[ -d "$INSTALL_DIR" && ! -L "$INSTALL_DIR" ]]; then
    echo "Backing up current install to ~/.superbot-plugin.bak"
    mv "$INSTALL_DIR" "${INSTALL_DIR}.bak"
  fi
  ln -sfn "$PLUGIN_ROOT" "$INSTALL_DIR"
  echo "Done. ~/.superbot-plugin → $PLUGIN_ROOT"
  echo "Changes in ~/dev/superbot are now live immediately."
  exit 0
fi

# Default: rsync deploy
if [[ ! -d "$INSTALL_DIR" ]]; then
  echo "No install directory found at $INSTALL_DIR. Creating it."
  mkdir -p "$INSTALL_DIR"
fi

echo "Deploying $PLUGIN_ROOT → $INSTALL_DIR"
rsync -av --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.firecrawl' \
  "$PLUGIN_ROOT/" "$INSTALL_DIR/"

echo ""
echo "Done. $(date '+%A %B %-d, %-I:%M %p')"
