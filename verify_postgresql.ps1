# ============================================================================
# PostgreSQL Migration Verification Script
# ============================================================================

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "PostgreSQL Database Verification" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL container is running
Write-Host "Checking PostgreSQL container..." -ForegroundColor Yellow
$dbContainer = docker-compose ps -q db
if (-not $dbContainer) {
    Write-Host "ERROR: PostgreSQL container is not running!" -ForegroundColor Red
    Write-Host "Start it with: docker-compose up -d db" -ForegroundColor Gray
    exit 1
}
Write-Host "✓ PostgreSQL container is running" -ForegroundColor Green
Write-Host ""

# Check database connection
Write-Host "Testing database connection..." -ForegroundColor Yellow
$connectionTest = docker-compose exec db pg_isready -U church_user -d church_platform 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database connection successful" -ForegroundColor Green
} else {
    Write-Host "✗ Database connection failed" -ForegroundColor Red
}
Write-Host ""

# Get database statistics
Write-Host "Database Statistics:" -ForegroundColor Cyan
Write-Host "-" * 80 -ForegroundColor Gray

# Database size
Write-Host "Database Size:" -ForegroundColor White
docker-compose exec db psql -U church_user church_platform -t -c "SELECT pg_size_pretty(pg_database_size('church_platform'));"

# Table count
Write-Host "`nTotal Tables:" -ForegroundColor White
docker-compose exec db psql -U church_user church_platform -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Active connections
Write-Host "`nActive Connections:" -ForegroundColor White
docker-compose exec db psql -U church_user church_platform -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'church_platform';"

Write-Host ""
Write-Host "-" * 80 -ForegroundColor Gray

# Record counts for main tables
Write-Host "`nRecord Counts:" -ForegroundColor Cyan
Write-Host "-" * 80 -ForegroundColor Gray

$tables = @(
    @{Name="Users"; Query="SELECT COUNT(*) FROM users_user;"},
    @{Name="Posts"; Query="SELECT COUNT(*) FROM content_post;"},
    @{Name="Comments"; Query="SELECT COUNT(*) FROM interactions_comment;"},
    @{Name="Reactions"; Query="SELECT COUNT(*) FROM interactions_reaction;"}
)

foreach ($table in $tables) {
    try {
        $count = docker-compose exec db psql -U church_user church_platform -t -c $table.Query 2>$null
        if ($count) {
            Write-Host ("{0,-20} : {1}" -f $table.Name, $count.Trim()) -ForegroundColor White
        }
    } catch {
        Write-Host ("{0,-20} : Table not found" -f $table.Name) -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "-" * 80 -ForegroundColor Gray

# Top 10 largest tables
Write-Host "`nTop 10 Largest Tables:" -ForegroundColor Cyan
docker-compose exec db psql -U church_user church_platform -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "Verification Complete!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green
Write-Host ""

# Quick commands reference
Write-Host "Quick Commands:" -ForegroundColor Cyan
Write-Host "  Open PostgreSQL shell : docker-compose exec db psql -U church_user church_platform" -ForegroundColor Gray
Write-Host "  Django shell          : docker-compose exec web python backend/manage.py shell" -ForegroundColor Gray
Write-Host "  View logs            : docker-compose logs -f db" -ForegroundColor Gray
Write-Host "  Create backup        : python manage_database.py backup" -ForegroundColor Gray
Write-Host ""
