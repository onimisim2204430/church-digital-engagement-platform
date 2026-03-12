# ============================================================================
# SQLite to PostgreSQL Migration Guide
# ============================================================================

This guide walks you through migrating your existing SQLite database to PostgreSQL in Docker.

## Prerequisites

- Docker and Docker Compose installed
- Existing SQLite database at `backend/db.sqlite3`
- Python virtual environment active (for running migration scripts)

## Migration Overview

```
┌─────────────────┐
│ SQLite Database │
│  (db.sqlite3)   │
└────────┬────────┘
         │
         │ 1. Export (dumpdata)
         ▼
┌─────────────────────┐
│   JSON Files        │
│ (migration_data/)   │
└─────────┬───────────┘
          │
          │ 2. Import (loaddata)
          ▼
┌──────────────────────┐
│ PostgreSQL Database  │
│  (Docker Container)  │
└──────────────────────┘
```

## Step-by-Step Migration Process

### Step 1: Export SQLite Data

**Option A: Using the provided script (Recommended)**
```powershell
# Ensure you're in the project root
cd "C:\Users\DELL\Desktop\Apps\Church Digital Engagement Platform"

# Run the export script
python export_sqlite_data.py
```

**Option B: Manual export**
```powershell
# Export all data
python backend/manage.py dumpdata `
  --natural-foreign `
  --natural-primary `
  --indent 2 `
  --exclude contenttypes `
  --exclude auth.permission `
  --exclude sessions `
  --output migration_data/sqlite_data.json

# Or export by app
python backend/manage.py dumpdata users --indent 2 --output migration_data/users.json
python backend/manage.py dumpdata content --indent 2 --output migration_data/content.json
python backend/manage.py dumpdata interactions --indent 2 --output migration_data/interactions.json
```

**What gets exported:**
- ✅ All user accounts
- ✅ Content (posts, articles, etc.)
- ✅ User interactions (comments, reactions, etc.)
- ✅ Email campaigns
- ✅ Moderation data
- ❌ Sessions (regenerated on login)
- ❌ ContentTypes (auto-created by Django)
- ❌ Permissions (auto-created by migrations)

### Step 2: Start PostgreSQL Container

```powershell
# Create .env file with database credentials
cp .env.production.example .env.production

# Edit .env.production and set:
# POSTGRES_DB=church_platform
# POSTGRES_USER=church_user
# POSTGRES_PASSWORD=your_secure_password

# Start PostgreSQL only
docker-compose up -d db

# Wait for PostgreSQL to be ready (check logs)
docker-compose logs -f db
# Wait until you see: "database system is ready to accept connections"
```

### Step 3: Run Migrations on PostgreSQL

```powershell
# Set environment to use PostgreSQL
$env:DATABASE_URL="postgresql://church_user:your_password@localhost:5432/church_platform"

# Run migrations to create tables
docker-compose exec web python backend/manage.py migrate

# Or if container isn't running yet, use local Django:
python backend/manage.py migrate
```

### Step 4: Import Data into PostgreSQL

**Option A: Using the provided script (Recommended)**
```powershell
# Ensure DATABASE_URL points to PostgreSQL
$env:DATABASE_URL="postgresql://church_user:your_password@localhost:5432/church_platform"

# Run the import script
python import_to_postgresql.py
```

**Option B: Manual import**
```powershell
# Set PostgreSQL as the database
$env:DATABASE_URL="postgresql://church_user:your_password@localhost:5432/church_platform"

# Import all data
python backend/manage.py loaddata migration_data/sqlite_data.json

# Or import by app (if main import fails)
python backend/manage.py loaddata migration_data/users.json
python backend/manage.py loaddata migration_data/content.json
python backend/manage.py loaddata migration_data/interactions.json
```

### Step 5: Verify Migration

```powershell
# Connect to PostgreSQL
docker-compose exec db psql -U church_user -d church_platform

# Run queries to verify data
SELECT COUNT(*) FROM users_user;
SELECT COUNT(*) FROM content_post;
SELECT COUNT(*) FROM interactions_comment;

# Exit psql
\q

# Or use Django shell
docker-compose exec web python backend/manage.py shell

>>> from apps.users.models import User
>>> from apps.content.models import Post
>>> print(f"Users: {User.objects.count()}")
>>> print(f"Posts: {Post.objects.count()}")
>>> exit()
```

### Step 6: Update Environment Variables

Update `.env.production` to use PostgreSQL permanently:

```bash
# PostgreSQL Database (Production)
POSTGRES_DB=church_platform
POSTGRES_USER=church_user
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://church_user:your_secure_password_here@db:5432/church_platform
```

### Step 7: Start Full Application

```powershell
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f web

# Access application
# http://localhost:8000
```

## Troubleshooting Common Issues

### Issue 1: IntegrityError during import

**Cause**: Foreign key constraints or duplicate data

**Solution**:
```powershell
# Try importing in specific order
python backend/manage.py loaddata migration_data/users.json
python backend/manage.py loaddata migration_data/content.json
python backend/manage.py loaddata migration_data/interactions.json

# Or disable constraints temporarily (PostgreSQL)
docker-compose exec db psql -U church_user -d church_platform -c "SET CONSTRAINTS ALL DEFERRED;"
```

### Issue 2: UUIDs not matching

**Cause**: UUID fields may need special handling

**Solution**:
```powershell
# Export with natural keys (already in script)
python backend/manage.py dumpdata --natural-foreign --natural-primary
```

### Issue 3: Permission denied errors

**Cause**: PostgreSQL user doesn't have proper permissions

**Solution**:
```powershell
# Grant all privileges
docker-compose exec db psql -U church_user -d church_platform
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO church_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO church_user;
```

### Issue 4: Data already exists

**Cause**: Running import multiple times

**Solution**:
```powershell
# Clear PostgreSQL database and start fresh
docker-compose exec db psql -U church_user -d church_platform -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run migrations again
docker-compose exec web python backend/manage.py migrate

# Import data again
python import_to_postgresql.py
```

## Database Backup & Restore

### Backup PostgreSQL

```powershell
# Create backup directory
mkdir backups

# Backup database to SQL file
docker-compose exec db pg_dump -U church_user church_platform > backups/backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Or backup to custom format (compressed)
docker-compose exec db pg_dump -U church_user -F c church_platform > backups/backup.dump
```

### Restore PostgreSQL

```powershell
# From SQL file
cat backups/backup.sql | docker-compose exec -T db psql -U church_user church_platform

# From custom format
docker-compose exec -T db pg_restore -U church_user -d church_platform < backups/backup.dump
```

## Performance Optimization

After migration, optimize PostgreSQL:

```powershell
# Connect to database
docker-compose exec db psql -U church_user church_platform

# Analyze tables
ANALYZE;

# Vacuum database
VACUUM ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('church_platform'));
```

## Rollback Plan

If migration fails and you need to go back to SQLite:

```powershell
# Stop containers
docker-compose down

# Remove DATABASE_URL from .env.production (or set to SQLite)
# DATABASE_URL=sqlite:///db.sqlite3

# Your SQLite database is still at backend/db.sqlite3
# Restart with SQLite
docker-compose up -d
```

## Production Deployment Checklist

After successful migration:

- [ ] Verify all data imported correctly
- [ ] Test user login
- [ ] Test content creation
- [ ] Test file uploads (media files)
- [ ] Check database backups are working
- [ ] Update monitoring/alerts
- [ ] Document PostgreSQL credentials securely
- [ ] Set up automated backups
- [ ] Configure connection pooling if needed
- [ ] Review query performance

## Additional Resources

- [Django Database Documentation](https://docs.djangoproject.com/en/5.2/ref/databases/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Django dumpdata/loaddata](https://docs.djangoproject.com/en/5.2/ref/django-admin/#dumpdata)

## Support

If you encounter issues:
1. Check PostgreSQL logs: `docker-compose logs db`
2. Check Django logs: `docker-compose logs web`
3. Verify DATABASE_URL is correct
4. Ensure migrations ran successfully
5. Check data files in `migration_data/` directory
