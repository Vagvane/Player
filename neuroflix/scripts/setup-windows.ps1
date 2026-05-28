# Neuroflix Windows Setup Script
# Requires: Node.js 18+, npm 9+, PowerShell 5.1+

# Set working directory to the neuroflix project root (parent of scripts/)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Neuroflix Video Player - Windows Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

$nodeMajor = [int]($nodeVersion -replace 'v', '' -split '\.')[0]
if ($nodeMajor -lt 18) {
    Write-Host "❌ Node.js $nodeVersion found but version 18+ is required!" -ForegroundColor Red
    Write-Host "   Please upgrade Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green

# Check npm version
$npmVersion = npm --version 2>$null
Write-Host "✅ npm installed: v$npmVersion" -ForegroundColor Green
Write-Host ""

# Setup Frontend
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  1. Setting up Frontend (React + Vite)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Set-Location frontend

Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend installation failed!" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}
Write-Host "✅ Frontend dependencies installed!" -ForegroundColor Green
Write-Host ""

Set-Location $ProjectRoot

# Setup Backend
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  2. Setting up Backend (Express + Prisma)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Set-Location backend

Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend installation failed!" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}
Write-Host "✅ Backend dependencies installed!" -ForegroundColor Green
Write-Host ""

Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generation failed!" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}
Write-Host "✅ Prisma Client generated!" -ForegroundColor Green
Write-Host ""

Set-Location $ProjectRoot

# Setup Video Processor
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  3. Setting up Video Processor (FFmpeg)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Set-Location video-processor

Write-Host "📦 Installing video processor dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Video processor installation failed!" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}
Write-Host "✅ Video processor dependencies installed!" -ForegroundColor Green
Write-Host ""

Set-Location $ProjectRoot

# Download FFmpeg
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  4. Downloading FFmpeg" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$ffmpegPath = "video-processor\ffmpeg\bin\ffmpeg.exe"
if (Test-Path $ffmpegPath) {
    Write-Host "✅ FFmpeg already installed!" -ForegroundColor Green
    $version = & $ffmpegPath -version 2>&1 | Select-Object -First 1
    Write-Host "   $version" -ForegroundColor Gray
} else {
    Write-Host "📥 Downloading FFmpeg (this may take a few minutes)..." -ForegroundColor Yellow
    node scripts/download-ffmpeg.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ FFmpeg download failed!" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Create .env files
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  5. Creating Environment Files" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Frontend .env
if (-not (Test-Path "frontend\.env")) {
    if (Test-Path "frontend\.env.example") {
        Write-Host "📝 Creating frontend/.env..." -ForegroundColor Yellow
        Copy-Item "frontend\.env.example" "frontend\.env"
        Write-Host "✅ frontend/.env created!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  frontend/.env.example not found, skipping..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ frontend/.env already exists" -ForegroundColor Green
}

# Backend .env
if (-not (Test-Path "backend\.env")) {
    if (Test-Path "backend\.env.example") {
        Write-Host "📝 Creating backend/.env..." -ForegroundColor Yellow
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "✅ backend/.env created!" -ForegroundColor Green
        Write-Host "⚠️  Please configure backend/.env with your database credentials!" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  backend/.env.example not found, skipping..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ backend/.env already exists" -ForegroundColor Green
}

# Video Processor .env
if (-not (Test-Path "video-processor\.env")) {
    if (Test-Path "video-processor\.env.example") {
        Write-Host "📝 Creating video-processor/.env..." -ForegroundColor Yellow
        Copy-Item "video-processor\.env.example" "video-processor\.env"
        Write-Host "✅ video-processor/.env created!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  video-processor/.env.example not found, skipping..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ video-processor/.env already exists" -ForegroundColor Green
}

Write-Host ""

# Final Summary
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Setup Complete! 🎉" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start Docker (PostgreSQL + Redis):" -ForegroundColor White
Write-Host "   docker compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure Cloudflare R2 credentials in backend/.env and video-processor/.env" -ForegroundColor White
Write-Host ""
Write-Host "3. Run database migrations:" -ForegroundColor White
Write-Host "   cd backend && npm run db:migrate" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start development servers (3 terminals):" -ForegroundColor White
Write-Host "   Frontend:  cd frontend && npm run dev" -ForegroundColor Gray
Write-Host "   Backend:   cd backend && npm run dev" -ForegroundColor Gray
Write-Host "   Worker:    cd video-processor && npm run worker" -ForegroundColor Gray
Write-Host ""
Write-Host "For full instructions, see docs/SETUP.md" -ForegroundColor Cyan
Write-Host ""
