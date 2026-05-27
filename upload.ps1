# -------------------------------------------------------------------
# Trustera Consulting - GitHub Upload Helper (Pre-configured)
# -------------------------------------------------------------------
# This script will check for Git, install it if missing, and push
# your website code to your GitHub repository: https://github.com/Siddh1710/Truestera.git

# CRITICAL FIX: Ensure the script runs in the directory where the files are located!
Set-Location $PSScriptRoot

Clear-Host
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "     Trustera Website - GitHub Upload Utility" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host

$repoUrl = "https://github.com/Siddh1710/Truestera.git"

# 1. Check if Git is installed
$gitCheck = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCheck) {
    Write-Host "[!] Git was not found on your system." -ForegroundColor Yellow
    Write-Host "[*] Attempting to install Git automatically via winget..." -ForegroundColor Cyan
    
    # Run winget installer
    winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
    
    # Reload path environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Verify installation
    $gitCheck = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCheck) {
        Write-Host "[X] Automatic installation failed or requires a terminal restart." -ForegroundColor Red
        Write-Host "Please install Git manually from: https://git-scm.com/download/win" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit
    }
    Write-Host "[+] Git installed successfully!" -ForegroundColor Green
} else {
    Write-Host "[+] Git is already installed." -ForegroundColor Green
}

# 2. Initialize and commit
Write-Host
Write-Host "[*] Preparing repository commit in: $PSScriptRoot" -ForegroundColor Cyan

# Set safe directory config for git
git config --global --add safe.directory "*"

# Initialize repo if needed
if (-not (Test-Path .git)) {
    git init
}

# Add all files to staging
git add .

# Set placeholder email/name if not configured
$gitUser = git config user.name
if (-not $gitUser) {
    git config --global user.name "Siddh"
    git config --global user.email "trusteraconsulanting@gmail.com"
}

# Commit
git commit -m "feat: upload trustera consulting website to github"

# Rename branch to main
git branch -M main

# Add origin remote (remove old one if exists)
git remote remove origin 2>$null
git remote add origin $repoUrl

# 3. Push to GitHub
Write-Host
Write-Host "[*] Pushing files to: $repoUrl" -ForegroundColor Cyan
Write-Host "Note: A secure window may pop up asking you to log in to your GitHub account." -ForegroundColor Yellow
Write-Host "Please click 'Sign in with your browser' to complete authentication." -ForegroundColor Green
Write-Host

git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "[+] SUCCESS: Your code is uploaded to GitHub!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Host
    Write-Host "[X] Error uploading to GitHub. Please check details and try again." -ForegroundColor Red
}

Write-Host
Read-Host "Press Enter to close this window"
