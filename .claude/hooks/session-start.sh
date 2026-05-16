#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "Installing Second Brain dependencies..."
npm install

echo "Starting Second Brain server..."
pkill -f "node server.js" 2>/dev/null || true
nohup node server.js > /tmp/second-brain.log 2>&1 &
echo "Server started (PID $!)"
