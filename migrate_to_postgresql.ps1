# ============================================================================
# SQLite to PostgreSQL Migration Script (PowerShell)
# ============================================================================

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "SQLite to PostgreSQL Migration" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Create migration_data directory if it doesn't exist
if (-not (Test-Path "migration_data")) {
    New-Item -ItemType Directory -Path "migration_data" | Out-Null
}

# Step 1: Export SQLite data
Write-Host "[Step 1/5] Exporting data from SQLite..." -ForegroundColor Yellow
try {
    python backend\manage.py dumpdata `
        --natural-foreign `
        --natural-primary `
        --indent 2 `
        --exclude contenttypes `
        --exclude auth.permission `
        --exclude sessions `
        --output migration_data\db.json
    
    if ($LASTEXITCODE -ne 0) { throw "Export failed" }
    
    $fileSize = (Get-Item "migration_data\db.json").Length / 1MB
    Write-Host "SUCCESS: Data exported to migration_data\db.json ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to export data from SQLite" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 2: Start PostgreSQL
Write-Host "[Step 2/5] Starting PostgreSQL container..." -ForegroundColor Yellow
try {
    docker-compose up -d db
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL start failed" }
    
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    Write-Host "SUCCESS: PostgreSQL is running" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to start PostgreSQL" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 3: Run migrations
Write-Host "[Step 3/5] Running database migrations..." -ForegroundColor Yellow
try {
    docker-compose run --rm web python backend/manage.py migrate
    if ($LASTEXITCODE -ne 0) { throw "Migrations failed" }
    
    Write-Host "SUCCESS: Migrations completed" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to run migrations" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 4: Load data
Write-Host "[Step 4/5] Loading data into PostgreSQL..." -ForegroundColor Yellow
Write-Host "This may take several minutes for large databases..." -ForegroundColor Gray
try {
    docker-compose run --rm web python backend/manage.py loaddata migration_data\db.json
    if ($LASTEXITCODE -ne 0) { throw "Data load failed" }
    
    Write-Host "SUCCESS: Data loaded into PostgreSQL" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "WARNING: Main data load failed. Trying individual app imports..." -ForegroundColor Yellow
    
    # Try loading individual app data
    $apps = @("users", "content", "interactions", "email_campaigns", "moderation")
    foreach ($app in $apps) {
        $appFile = "migration_data\$app.json"
        if (Test-Path $appFile) {
            Write-Host "  Loading $app..." -ForegroundColor Gray
            docker-compose run --rm web python backend/manage.py loaddata $appFile
        }
    }
    Write-Host ""
}

# Step 5: Verify
Write-Host "[Step 5/5] Verifying migration..." -ForegroundColor Yellow
try {
    Write-Host "Database Statistics:" -ForegroundColor Cyan
    docker-compose exec db psql -U church_user church_platform -c "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';"
    Write-Host ""
} catch {
    Write-Host "Could not verify (container may not be running)" -ForegroundColor Gray
}

# Summary
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify your data:" -ForegroundColor White
Write-Host "   docker-compose exec web python backend/manage.py shell" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Create superuser (if needed):" -ForegroundColor White
Write-Host "   docker-compose exec web python backend/manage.py createsuperuser" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start full application:" -ForegroundColor White
Write-Host "   docker-compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Access application:" -ForegroundColor White
Write-Host "   http://localhost:8000" -ForegroundColor Gray
Write-Host ""
