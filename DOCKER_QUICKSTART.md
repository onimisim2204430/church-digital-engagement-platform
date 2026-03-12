# 🚀 Quick Start - Production Docker Deployment

## What's Been Configured

Your application is now production-ready with:
- ✅ Multi-stage Docker build (optimized React + Django)
- ✅ React served as static files through Django
- ✅ All routes handled correctly (API at `/api/v1/*`, React at `/`)
- ✅ Whitenoise for efficient static file serving
- ✅ Gunicorn with production settings (4 workers, 2 threads)
- ✅ Non-root user for security
- ✅ Health checks
- ✅ Docker Compose for full stack deployment

## 🎯 Build and Run (3 Simple Steps)

### Step 1: Build the Docker Image
```powershell
docker build -t church-platform:latest .
```

### Step 2: Run the Container
```powershell
# Option A: Simple run (using SQLite database)
docker run -d `
  --name church-platform `
  -p 8000:8000 `
  -e SECRET_KEY="your-secret-key-change-this" `
  -e DEBUG=False `
  -e ALLOWED_HOSTS="localhost,127.0.0.1" `
  church-platform:latest

# Option B: Run with environment file
docker run -d `
  --name church-platform `
  -p 8000:8000 `
  --env-file .env.production `
  church-platform:latest
```

### Step 3: Run Migrations & Create Superuser
```powershell
# Run database migrations
docker exec church-platform python backend/manage.py migrate

# Create admin user
docker exec -it church-platform python backend/manage.py createsuperuser
```

## 🌐 Access Your Application

- **React Frontend**: http://localhost:8000/
- **Django Admin**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/v1/docs/
- **API Endpoints**: http://localhost:8000/api/v1/*

## 🐳 Using Docker Compose (Recommended for Full Stack)

### Run Everything (Django + PostgreSQL + Redis + Celery)
```powershell
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Run migrations
docker-compose exec web python backend/manage.py migrate

# Create superuser
docker-compose exec web python backend/manage.py createsuperuser

# Stop all services
docker-compose down
```

## 📝 Environment Variables Setup

Create `.env.production` file:
```bash
SECRET_KEY=your-super-secret-key-here-change-this
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,localhost
DATABASE_URL=postgresql://user:pass@db:5432/church_platform
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

Or use the template:
```powershell
cp .env.production.example .env.production
# Edit .env.production with your values
```

## 🔍 Verify Everything Works

### 1. Check Container Status
```powershell
docker ps
```

### 2. Check Logs
```powershell
docker logs church-platform
```

### 3. Test the Application
```powershell
# Test React frontend
curl http://localhost:8000/

# Test API docs
curl http://localhost:8000/api/v1/docs/

# Test API endpoint
curl http://localhost:8000/api/v1/public/posts/
```

### 4. Check Static Files Were Collected
```powershell
docker exec church-platform ls -la /app/backend/staticfiles/
```

## 🔧 Troubleshooting

### Issue: React shows 404
**Solution**: Ensure collectstatic ran successfully
```powershell
docker exec church-platform python backend/manage.py collectstatic --noinput
```

### Issue: Build fails at npm install
**Solution**: Clear Docker cache and rebuild
```powershell
docker build --no-cache -t church-platform:latest .
```

### Issue: Cannot connect to database
**Solution**: Check DATABASE_URL environment variable
```powershell
docker exec church-platform env | grep DATABASE_URL
```

### Issue: Static files not loading
**Solution**: Check Whitenoise middleware is enabled
```powershell
docker exec church-platform python backend/manage.py diffsettings | grep MIDDLEWARE
```

## 📦 What Happens During Build

```
STAGE 1: Build React
├── Install Node.js dependencies
├── Build React app → /frontend-build/build
└── Output: Optimized production build

STAGE 2: Build Django
├── Install Python dependencies
├── Copy React build → /app/frontend-build
├── Run collectstatic (collects React + Django admin files)
├── Create non-root user
└── Start Gunicorn with Django

Result: Single container serving both React and Django
```

## 🎭 How Routing Works

```
Browser Request → Django (port 8000)
│
├─ /api/v1/* → Django REST Framework (JSON responses)
├─ /admin/* → Django Admin
└─ /* (everything else) → ReactAppView
   └── Serves index.html
       └── React Router handles client-side routing
```

## 🚀 Deploy to Cloud

### AWS
```bash
docker tag church-platform:latest YOUR_ECR_URI/church-platform:latest
docker push YOUR_ECR_URI/church-platform:latest
# Deploy to ECS/Fargate
```

### Azure
```bash
docker tag church-platform:latest yourregistry.azurecr.io/church-platform:latest
docker push yourregistry.azurecr.io/church-platform:latest
# Deploy to Azure Container Apps
```

### Google Cloud
```bash
docker tag church-platform:latest gcr.io/YOUR_PROJECT/church-platform:latest
docker push gcr.io/YOUR_PROJECT/church-platform:latest
# Deploy to Cloud Run
```

## 📚 Additional Documentation

- Full deployment guide: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- Environment variables: [.env.production.example](.env.production.example)
- Docker Compose: [docker-compose.yml](docker-compose.yml)

## ✅ Production Checklist

Before deploying to production:
- [ ] Change SECRET_KEY to a random value
- [ ] Set DEBUG=False
- [ ] Configure ALLOWED_HOSTS with your domain
- [ ] Set up PostgreSQL database (don't use SQLite)
- [ ] Configure CORS_ALLOWED_ORIGINS
- [ ] Set up SSL/HTTPS
- [ ] Configure email settings
- [ ] Set up monitoring and logging
- [ ] Configure backups
- [ ] Review security settings

## 🎉 You're Ready!

Your application is now containerized and ready for production deployment. The React frontend and Django backend are served from a single container on port 8000.
