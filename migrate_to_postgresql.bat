@echo off
REM ============================================================================
REM SQLite to PostgreSQL Migration Script (Windows)
REM ============================================================================

echo ============================================================================
echo SQLite to PostgreSQL Migration
echo ============================================================================
echo.

REM Step 1: Export SQLite data
echo [Step 1/5] Exporting data from SQLite...
python backend\manage.py dumpdata ^
  --natural-foreign ^
  --natural-primary ^
  --indent 2 ^
  --exclude contenttypes ^
  --exclude auth.permission ^
  --exclude sessions ^
  --output migration_data\db.json

if %errorlevel% neq 0 (
    echo ERROR: Failed to export data from SQLite
    pause
    exit /b 1
)

echo SUCCESS: Data exported to migration_data\db.json
echo.

REM Step 2: Start PostgreSQL
echo [Step 2/5] Starting PostgreSQL container...
docker-compose up -d db

if %errorlevel% neq 0 (
    echo ERROR: Failed to start PostgreSQL
    pause
    exit /b 1
)

echo Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak > nul
echo.

REM Step 3: Run migrations
echo [Step 3/5] Running database migrations...
docker-compose run --rm web python backend/manage.py migrate

if %errorlevel% neq 0 (
    echo ERROR: Failed to run migrations
    pause
    exit /b 1
)

echo SUCCESS: Migrations completed
echo.

REM Step 4: Load data
echo [Step 4/5] Loading data into PostgreSQL...
docker-compose run --rm web python backend/manage.py loaddata migration_data\db.json

if %errorlevel% neq 0 (
    echo ERROR: Failed to load data
    echo TIP: Try loading individual app data files
    pause
    exit /b 1
)

echo SUCCESS: Data loaded into PostgreSQL
echo.

REM Step 5: Verify
echo [Step 5/5] Verifying migration...
docker-compose exec db psql -U church_user church_platform -c "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';"

echo.
echo ============================================================================
echo Migration Complete!
echo ============================================================================
echo.
echo Next steps:
echo 1. Verify your data: docker-compose exec web python backend/manage.py shell
echo 2. Create superuser: docker-compose exec web python backend/manage.py createsuperuser
echo 3. Start application: docker-compose up -d
echo.
pause
