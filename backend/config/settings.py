"""
Django settings for Church Digital Engagement Platform.

This is a production-ready configuration for a church digital platform
that handles authentication, content management, and member engagement.

Security: All sensitive values loaded from environment variables.
Database: PostgreSQL in production, configurable via DATABASE_URL.
Authentication: JWT-based with custom User model.
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ==============================================================================
# SECURITY SETTINGS
# ==============================================================================

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Enable detailed error logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'payments': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'email': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'email.providers': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'admin_auth': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

#ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())
ALLOWED_HOSTS = ['*']


# ==============================================================================
# APPLICATION DEFINITION
# ==============================================================================

# Conditional apps - only include if installed
_INSTALLED_APPS = []

# Try to import channels/daphne for WebSocket support
try:
    import daphne
    import channels
    _INSTALLED_APPS.extend(['daphne', 'channels'])
except ImportError:
    pass

INSTALLED_APPS = _INSTALLED_APPS + [
    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    
    # Local apps
    'apps.users',
    'apps.content',
    'apps.interactions',
    'apps.email_campaigns',
    'apps.moderation',
    'apps.series',
    'apps.bible',
    'apps.payments',
    'apps.giving',
    'apps.payouts',
    'apps.notifications',
    'apps.email',  # Standalone email service
    'apps.analytics',  # Analytics and visitor tracking
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # AuthenticationMiddleware moved BEFORE CsrfViewMiddleware to fix JWT 403 error
    # This allows CSRF to make smarter decisions based on authentication state
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # SENIOR ENGINEER FIX: JWT CSRF exemption BEFORE CSRF middleware
    'config.middleware.JWTCSRFExemptMiddleware',  # Bypass CSRF for Bearer tokens
    'django.middleware.csrf.CsrfViewMiddleware',   # CSRF validation (re-enabled)
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Custom middleware re-enabled after fixing CSRF issue
    'config.middleware.RequestLoggingMiddleware',
    'config.middleware.RateLimitMiddleware',  # Rate limiting for email verification
]

ROOT_URLCONF = 'config.urls'

# Disable CommonMiddleware URL adjustments
APPEND_SLASH = False
PREPEND_WWW = False

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
            BASE_DIR / 'frontend-build',  # For React index.html
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'apps.email.context_processors.email_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ASGI configuration for WebSocket support (only if channels installed)
try:
    import channels
    ASGI_APPLICATION = 'config.asgi.application'
except ImportError:
    ASGI_APPLICATION = 'config.wsgi.application'


# ==============================================================================
# CHANNELS & WEBSOCKET CONFIGURATION (conditional)
# ==============================================================================

try:
    import channels
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                # Redis connection URL (same as Celery for consistency)
                'hosts': [config('REDIS_URL', default='redis://127.0.0.1:6379/2')],
                'capacity': 1500,
                # How long an unread message waits before expiring.  60s is plenty
                # for delivery since Celery enqueues and Daphne dispatches in <1s.
                'expiry': 60,
                # How long a group member entry lives in Redis.  Must be longer
                # than any realistic WebSocket session.  Previously 10s — that was
                # causing all notifications sent >10 s after page-load to be
                # silently dropped because the channel had already been removed from
                # the group.  86400 = 24 h; the consumer keepalive renews it every 50s.
                'group_expiry': 86400,
                'symmetric_encryption_keys': [SECRET_KEY],
            },
        },
    }
except ImportError:
    # Channels not installed - use in-memory backend for development
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }


# ==============================================================================
# DATABASE CONFIGURATION
# ==============================================================================
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Use DATABASE_URL for PostgreSQL in production, fallback to SQLite for development
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# PostgreSQL-specific optimizations
if DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
    DATABASES['default'].update({
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 seconds
        },
        'ATOMIC_REQUESTS': True,
        'AUTOCOMMIT': True,
    })


# ==============================================================================
# AUTHENTICATION & USER MODEL
# ==============================================================================

# Custom user model with UUID primary key
AUTH_USER_MODEL = 'users.User'

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ==============================================================================
# REST FRAMEWORK CONFIGURATION
# ==============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ),
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'NON_FIELD_ERRORS_KEY': 'error',
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%SZ',
}


# ==============================================================================
# JWT CONFIGURATION
# ==============================================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_REFRESH_TOKEN_LIFETIME', default=1440, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('JWT_SECRET_KEY', default=SECRET_KEY),
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    # Bakes role + permissions list into the JWT payload at issue time
    'TOKEN_OBTAIN_SERIALIZER': 'apps.users.serializers.CustomTokenObtainPairSerializer',
}


# ==============================================================================
# CORS CONFIGURATION
# ==============================================================================

# CORS settings
# NOTE: CORS_ALLOW_ALL_ORIGINS = True does NOT work with CORS_ALLOW_CREDENTIALS = True
# Must explicitly list allowed origins when using credentials
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://g98l5wj0-3000.uks1.devtunnels.ms',  # React Dev Tunnel
    'https://g98l5wj0-8000.uks1.devtunnels.ms',  # Django Dev Tunnel (for cross-origin)
    'https://church-digital-engagement-platform.onrender.com',  # Production on Render
]
# Set to False since we removed withCredentials from frontend (JWT-only, no cookies)
CORS_ALLOW_CREDENTIALS = False

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_PREFLIGHT_MAX_AGE = 86400  # 24 hours

# CSRF CONFIGURATION
# ==============================================================================
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://g98l5wj0-3000.uks1.devtunnels.ms',  # React Dev Tunnel
    'https://g98l5wj0-8000.uks1.devtunnels.ms',  # Django Dev Tunnel
    'https://church-digital-engagement-platform.onrender.com',  # Production on Render
]
# Allow Dev Tunnel origin for cookies
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SECURE = True

# ==============================================================================
# INTERNATIONALIZATION
# ==============================================================================
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'  # Store all times in UTC (single source of truth)

USE_I18N = True

USE_TZ = True  # Always use timezone-aware datetimes


# ==============================================================================
# STATIC & MEDIA FILES
# ==============================================================================
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Include React build output in static files collection
# Point to the 'static' subdirectory inside the React build
STATICFILES_DIRS = [
    BASE_DIR / 'frontend-build' / 'static',  # React static assets (js, css, media)
]

# Whitenoise configuration for serving static files efficiently
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True if DEBUG else False
WHITENOISE_INDEX_FILE = True  # Serve index.html for directory requests
WHITENOISE_KEEP_ONLY_HASHED_FILES = False  # Keep original files too

MEDIA_URL = '/media/'
MEDIA_ROOT = config('MEDIA_ROOT', default=str(BASE_DIR / 'media'))


# ==============================================================================
# EMAIL CONFIGURATION - FORCE SMTP PRODUCTION MODE
# ==============================================================================

import os
from pathlib import Path  

# CRITICAL: Load .env file explicitly
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_path)
        print(f"[SETTINGS] Loaded .env from: {env_path}")
    except ImportError:
        print(f"[SETTINGS] WARNING: python-dotenv not installed, skipping .env file")
else:
    print(f"[SETTINGS] WARNING: .env file not found at: {env_path}")

# FORCE SMTP BACKEND - NO CONDITIONALS
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'www.heavresearcher.247@gmail.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')  # Must be set via environment variable
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Church Digital Platform <www.heavresearcher.247@gmail.com>')
EMAIL_TIMEOUT = 30

# ==============================================================================
# EMAIL SERVICE CONFIGURATION
# ==============================================================================
# Centralised config for apps.email (the standalone email service).
# Each entry in 'providers' corresponds to one provider class.
# Providers are tried in ascending 'priority' order; on failure the next
# provider is attempted (failover).  Set 'enabled': False to disable one.

EMAIL_SERVICE_CONFIG = {
    # Global settings inherited by all providers unless overridden per-provider
    'default_from_email': os.environ.get('DEFAULT_FROM_EMAIL', ''),
    'default_from_name': os.environ.get('EMAIL_FROM_NAME', 'Church Digital Platform'),

    # Tracking & webhook base URL (used when building pixel / click URLs)
    'tracking_base_url': os.environ.get('SITE_URL', 'http://localhost:8000'),

    # HMAC signing key for tracking tokens and unsubscribe URLs
    # Falls back to Django SECRET_KEY if not set — set this explicitly in prod
    'tracking_secret': os.environ.get('EMAIL_TRACKING_SECRET', ''),

    'providers': [
        {
            'type': 'SMTP',
            'enabled': True,
            'priority': 1,  # Tried first
            # Credentials are read from the standard Django EMAIL_* env-vars;
            # no need to duplicate them here unless you want per-provider overrides.
            'password_env_var': 'EMAIL_HOST_PASSWORD',  # Name of the env-var
            'use_tls': True,
            'use_ssl': False,
            'timeout': 30,
        },
        {
            'type': 'SENDGRID',
            'enabled': bool(os.environ.get('SENDGRID_API_KEY')),  # Auto-enable when key present
            'priority': 2,  # Failover — used if SMTP fails
            'api_key_env_var': 'SENDGRID_API_KEY',  # Name of the env-var
            'sandbox_mode': DEBUG,  # Sandbox in dev/debug mode; real sends in production
        },
    ],

    # Circuit-breaker settings applied to every provider
    'circuit_breaker': {
        # Number of consecutive send failures before a provider is tripped OPEN
        'failure_threshold': int(os.environ.get('EMAIL_CB_FAILURE_THRESHOLD', 5)),
        # How long (seconds) a tripped circuit stays OPEN before self-healing probe
        'degraded_timeout': int(os.environ.get('EMAIL_CB_DEGRADED_TIMEOUT', 300)),
        # How long (seconds) a cached health-check result is trusted (TTL)
        'health_check_interval': int(os.environ.get('EMAIL_CB_HEALTH_INTERVAL', 300)),
    },
}

# ==============================================================================
# EMAIL SERVICE — PHASE 3 SETTINGS
# ==============================================================================

# Rate limits per email type.  Format: "<count>/<period>"
# Periods: second, minute, hour, day
EMAIL_RATE_LIMITS = {
    'VERIFICATION':   {'user': '5/hour',   'global': '500/hour'},
    'PASSWORD_RESET': {'user': '3/hour',   'global': '100/hour'},
    'SECURITY_ALERT': {'user': '10/hour',  'global': '1000/hour'},
    'TRANSACTIONAL':  {'user': '50/hour',  'global': '5000/hour'},
    'NOTIFICATION':   {'user': '20/hour',  'global': '2000/hour'},
    'BULK':           {'user': '10/day',   'global': '10000/day'},
}

# How long to keep compiled email templates in Redis (seconds).  Default 5 min.
EMAIL_TEMPLATE_CACHE_TIMEOUT = int(os.environ.get('EMAIL_TEMPLATE_CACHE_TIMEOUT', 300))

# Set True to generate + store tracking pixel tokens (opens tracking).
EMAIL_TRACKING_ENABLED = os.environ.get('EMAIL_TRACKING_ENABLED', 'True').lower() == 'true'

# HMAC secret for unsubscribe link signing.  MUST be set in production.
# Falls back to Django SECRET_KEY in DEBUG mode only.
EMAIL_UNSUBSCRIBE_SECRET = os.environ.get('EMAIL_UNSUBSCRIBE_SECRET', '')




# ==============================================================================
# CELERY CONFIGURATION (for background tasks)
# ==============================================================================

import platform as _platform

CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# Explicitly import task modules that must always be available to every worker.
# autodiscover_tasks() can silently miss these when called before Django is
# fully initialised (common on Windows with the threads pool).
CELERY_IMPORTS = [
    'apps.notifications.tasks',
    'apps.email.tasks',
]
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Windows cannot fork — prefork pool uses spawn, causing billiard's fast_trace_task
# to crash with "_loc" uninitialized in subprocesses.  Use threads on Windows
# (all tasks run in the main process, _loc is always set).  Linux/macOS use
# the default prefork pool via fork (no issue there).
if _platform.system() == 'Windows':
    CELERY_WORKER_POOL = 'threads'
    CELERY_WORKER_CONCURRENCY = 8

# Acknowledge tasks only after completion; prevents silent drops on worker crash.
CELERY_TASK_ACKS_LATE = True
# Don't prefetch more than one task per worker thread/process at a time.
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
# Never store task return values in Redis — we never inspect them and storing
# them caused EncodeError when a task returned a non-JSON-serialisable ORM object.
CELERY_TASK_IGNORE_RESULT = True

# For testing: run Celery tasks synchronously (eagerly) so tests complete immediately
import sys
if 'test' in sys.argv or os.getenv('CELERY_ALWAYS_EAGER'):
    CELERY_ALWAYS_EAGER = True
    CELERY_EAGER_PROPAGATES_EXCEPTIONS = True

# Celery Beat Schedule for periodic tasks
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Auto-publish daily words / scheduled posts (runs every hour at :01)
    'autopublish-scheduled-posts': {
        'task': 'content.autopublish_scheduled_posts',
        'schedule': crontab(minute=1),  # Every hour at :01
    },
    # Clean up expired payment intents every hour
    'cleanup-expired-intents': {
        'task': 'payments.cleanup_expired_intents',
        'schedule': crontab(minute=0),  # Every hour at :00
    },
    # Verify pending transactions every 10 minutes (webhook failure safety net)
    'verify-pending-transactions': {
        'task': 'payments.verify_pending_transactions',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
    },
    # Check for critical payment errors every 15 minutes
    'check-critical-errors': {
        'task': 'payments.check_critical_errors',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    # Retry FAILED email messages every 5 minutes (within their retry budget)
    'retry-failed-emails': {
        'task': 'email.retry_failed_emails',
        'schedule': crontab(minute='*/5'),
    },
    # Run provider health checks and update circuit-breaker state every 5 minutes
    'check-provider-health': {
        'task': 'email.check_provider_health',
        'schedule': crontab(minute='*/5'),
    },
    # Phase 3: delete EmailEvent rows older than 90 days (runs once daily at 2am)
    'cleanup-old-tracking-data': {
        'task': 'email.cleanup_old_tracking_data',
        'schedule': crontab(hour=2, minute=0),
    },
    # Expire payout withdrawals stuck in processing/otp_required for >30 min
    'expire-stale-withdrawals': {
        'task': 'payouts.expire_stale_withdrawals',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
}

# ==============================================================================
# CACHING CONFIGURATION
# ==============================================================================

CACHES = {
    "default": {
        "BACKEND":  "django_redis.cache.RedisCache",
        "LOCATION": config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        "OPTIONS":  {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT":  60 * 60 * 24 * 365,  # 365 days
    }
}

# ==============================================================================
# SECURITY SETTINGS (Development & Dev Tunnels)
# ==============================================================================

# Security settings - Development only
# Disable ALL HTTPS/SSL redirects in development
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = None
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False


# ==============================================================================
# SECURITY SETTINGS (Production)
# ==============================================================================

if not DEBUG:
    # HTTPS settings
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Additional security headers
    X_FRAME_OPTIONS = 'DENY'


# ==============================================================================
# API DOCUMENTATION (DRF Spectacular)
# ==============================================================================

SPECTACULAR_SETTINGS = {
    'TITLE': 'Church Digital Engagement Platform API',
    'DESCRIPTION': 'API documentation for the Church Digital Platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
}


# ==============================================================================
# APPLICATION-SPECIFIC SETTINGS
# ==============================================================================

# Site name for email templates and notifications
SITE_NAME = config('SITE_NAME', default='Church Digital Platform')
SITE_DOMAIN = config('SITE_DOMAIN', default='localhost:3000')

# Email verification settings
EMAIL_VERIFICATION_URL = config(
    'EMAIL_VERIFICATION_URL',
    default='{protocol}://{domain}/verify-email?token={token}'
)
EMAIL_VERIFICATION_EXPIRY_MINUTES = config(
    'EMAIL_VERIFICATION_EXPIRY_MINUTES',
    default=30,
    cast=int
)

# Default user role for new registrations
DEFAULT_USER_ROLE = 'VISITOR'

# Content moderation settings
AUTO_APPROVE_CONTENT = config('AUTO_APPROVE_CONTENT', default=False, cast=bool)

# Paystack Payment Gateway Configuration
PAYSTACK_PUBLIC_KEY = config('PAYSTACK_PUBLIC_KEY', default='')
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='')
PAYSTACK_WEBHOOK_SECRET = config('PAYSTACK_WEBHOOK_SECRET', default='')


# ==============================================================================
# DEFAULT FIELD TYPE
# ==============================================================================
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ==============================================================================
# DJANGO DEBUG TOOLBAR (Development Only)
# ==============================================================================

# TEMPORARILY DISABLED - Causing namespace issues
# if DEBUG:
#     INSTALLED_APPS += ['debug_toolbar']
#     MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
#     
#     INTERNAL_IPS = ['127.0.0.1', 'localhost']
#     
#     DEBUG_TOOLBAR_CONFIG = {
#         'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
#     }

