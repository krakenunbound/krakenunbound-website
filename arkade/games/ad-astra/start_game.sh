#!/bin/bash

# Ad Astra Game Launcher

# Ensure we are in the script's directory
cd "$(dirname "$0")"

PORT=8000

echo "🚀 Preparing to launch Ad Astra..."

# 1. & 2. Check for existing server and kill it
# We try to find a process on port 8000 using lsof or fuser
PID=""
if command -v lsof >/dev/null 2>&1; then
    PID=$(lsof -t -i:$PORT)
elif command -v fuser >/dev/null 2>&1; then
    PID=$(fuser $PORT/tcp 2>/dev/null)
fi

if [ -n "$PID" ]; then
    echo "⚠️  Found existing server (PID: $PID) on port $PORT. Killing it..."
    kill -9 $PID
    sleep 1 # Give it a moment to release the port
    echo "✅  Old server stopped."
else
    echo "✅  No existing server found on port $PORT."
fi

# 3. Start fresh server
echo "🌟 Starting new server..."
echo "🌍 Opening browser and connecting..."

# npm start runs: npx -y http-server -p 8000 -o -c-1
# The -o flag tells http-server to open the default browser automatically.
npm start
