#!/bin/bash
set -euo pipefail

# Only run in Claude Code for web
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the TypeScript project
echo "Building project..."
npm run build

# Link globally so claude-memory command is available
echo "Linking globally..."
npm link

echo "Session setup complete! claude-memory is ready to use."
