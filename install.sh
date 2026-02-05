#!/bin/bash
set -e

# Superbot installer
# Usage: curl -fsSL https://raw.githubusercontent.com/gkkirsch/superbot/main/install.sh | bash

INSTALL_DIR="${SUPERBOT_DIR:-$HOME/.superbot-plugin}"

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║       Installing Superbot     ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# --- Check prerequisites ---

missing=()

if ! command -v git &>/dev/null; then
  missing+=("git")
fi

if ! command -v node &>/dev/null; then
  missing+=("node")
fi

if ! command -v jq &>/dev/null; then
  missing+=("jq")
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required tools: ${missing[*]}"
  echo ""
  echo "Install them first:"
  for tool in "${missing[@]}"; do
    case "$tool" in
      git)  echo "  git  — https://git-scm.com" ;;
      node) echo "  node — https://nodejs.org (v18+)" ;;
      jq)   echo "  jq   — brew install jq / apt install jq" ;;
    esac
  done
  exit 1
fi

# --- Clone or update ---

if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  if [[ -d "$INSTALL_DIR" ]]; then
    echo "Directory $INSTALL_DIR exists but is not a git repo."
    echo "Remove it first or set SUPERBOT_DIR to a different path."
    exit 1
  fi
  echo "Cloning superbot to $INSTALL_DIR..."
  git clone https://github.com/gkkirsch/superbot.git "$INSTALL_DIR"
fi

# --- Run setup ---

echo ""
echo "Running setup..."
echo ""
bash "$INSTALL_DIR/scripts/setup.sh"
