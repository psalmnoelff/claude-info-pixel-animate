# ClOffice Pixel - Quick Launch Script
# Usage: powershell -ExecutionPolicy Bypass -File run.ps1

$ErrorActionPreference = "Stop"

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is required. Install from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "$PSScriptRoot\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --prefix "$PSScriptRoot"
}

# Launch Electron detached and exit (no lingering PowerShell window)
$electron = Join-Path $PSScriptRoot "node_modules\.bin\electron.cmd"
Start-Process -FilePath $electron -ArgumentList "`"$PSScriptRoot`"" -WindowStyle Hidden
