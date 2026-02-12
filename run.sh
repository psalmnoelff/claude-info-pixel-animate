#!/bin/bash
# ClOffice Pixel - Quick Launch Script
# Usage: ./run.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is required. Install from https://nodejs.org/"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    npm install --prefix "$SCRIPT_DIR"
fi

# Launch
echo "Starting ClOffice Pixel..."
npm start --prefix "$SCRIPT_DIR"
