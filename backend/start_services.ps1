# start_services.ps1
# Celery Service Startup Script for Windows
# Usage: .\start_services.ps1

$BACKEND_PATH = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==================================" -ForegroundColor Green
Write-Host "Church Digital Platform - Service Startup" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# Check Redis
Write-Host "[1/4] Checking Redis..." -ForegroundColor Cyan
$redisTest = redis-cli ping 2>$null
if ($redisTest -eq "PONG") {
    Write-Host "✓ Redis is running" -ForegroundColor Green
} else {
    Write-Host "✗ Redis NOT running! Start it with: redis-server" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "[2/4] Instructions - Open 3 NEW PowerShell windows and run each:" -ForegroundColor Yellow
Write-Host ""

Write-Host "WINDOW 1 (CRITICAL - Celery Worker):" -ForegroundColor Cyan
Write-Host "  cd '$BACKEND_PATH'" -ForegroundColor Yellow
Write-Host "  celery -A config worker -l info --pool=threads" -ForegroundColor Yellow
Write-Host ""

Write-Host "WINDOW 2 (Django Server):" -ForegroundColor Cyan
Write-Host "  cd '$BACKEND_PATH'" -ForegroundColor Yellow
Write-Host "  python manage.py runserver" -ForegroundColor Yellow
Write-Host ""

Write-Host "WINDOW 3 (Optional - Monitor):" -ForegroundColor Cyan
Write-Host "  cd '$BACKEND_PATH'" -ForegroundColor Yellow
Write-Host "  python monitor_celery.py" -ForegroundColor Yellow
Write-Host ""

Write-Host "==================================" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "✓ Redis checks PASSED" -ForegroundColor Green
Write-Host ""
Write-Host "Next:" -ForegroundColor Yellow
Write-Host "1. Open 2-3 new terminals" -ForegroundColor Yellow
Write-Host "2. Start Celery worker (REQUIRED for OTP to work)" -ForegroundColor Yellow
Write-Host "3. Start Django server" -ForegroundColor Yellow
Write-Host "4. (Optional) Run monitor to watch for crashes" -ForegroundColor Yellow
Write-Host ""
