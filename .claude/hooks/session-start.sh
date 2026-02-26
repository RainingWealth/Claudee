#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Starting session setup..."

# Detect and install dependencies based on what's present in the project
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Install marketing skills from coreyhaines31/marketingskills
echo "Installing marketing skills..."
SKILLS_DIR=".claude/skills"
mkdir -p "$SKILLS_DIR"
if [ -d "/tmp/marketingskills" ]; then
  rm -rf /tmp/marketingskills
fi
git clone --depth 1 https://github.com/coreyhaines31/marketingskills.git /tmp/marketingskills 2>/dev/null
cp -r /tmp/marketingskills/skills/* "$SKILLS_DIR/"
rm -rf /tmp/marketingskills
echo "Marketing skills installed successfully."

# Node.js / npm
if [ -f "package-lock.json" ]; then
  echo "Installing npm dependencies..."
  npm install
elif [ -f "package.json" ]; then
  echo "Installing npm dependencies..."
  npm install
fi

# Python / pip
if [ -f "requirements.txt" ]; then
  echo "Installing Python dependencies..."
  pip install -r requirements.txt --quiet
fi

# Python / pyproject.toml (Poetry or pip)
if [ -f "pyproject.toml" ]; then
  if command -v poetry &>/dev/null; then
    echo "Installing Poetry dependencies..."
    poetry install --no-interaction
  else
    echo "Installing Python dependencies from pyproject.toml..."
    pip install -e . --quiet 2>/dev/null || true
  fi
fi

# Ruby / Bundler
if [ -f "Gemfile" ]; then
  echo "Installing Ruby dependencies..."
  bundle install --quiet
fi

# Go modules
if [ -f "go.mod" ]; then
  echo "Downloading Go modules..."
  go mod download
fi

# Rust / Cargo
if [ -f "Cargo.toml" ]; then
  echo "Fetching Cargo dependencies..."
  cargo fetch
fi

echo "Session setup complete."
