# ClOffice Pixel - Quick Launch Script
# Usage: powershell -ExecutionPolicy Bypass -File run.ps1

$ErrorActionPreference = "Stop"

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is required. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "$PSScriptRoot\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --prefix "$PSScriptRoot"
}

# Launch
Write-Host "Starting ClOffice Pixel..." -ForegroundColor Green
npm start --prefix "$PSScriptRoot"
