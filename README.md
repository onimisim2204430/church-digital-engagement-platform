# Church Digital Engagement Platform

> A complete digital home for your church community — where congregation members connect, content is delivered, and church staff manage everything from one place.

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)](https://church-digital-engagement-platform.onrender.com)
[![Backend](https://img.shields.io/badge/backend-Django%205%20%2B%20DRF-092E20)](https://www.djangoproject.com/)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20TypeScript-61DAFB)](https://react.dev/)

---

## What Is This?

The **Church Digital Engagement Platform** is a full-stack web application purpose-built for churches and faith-based organizations. It gives churches a single, unified digital space to:

- **Publish and deliver** sermons, articles, devotionals, and announcements
- **Connect** congregation members with small groups, ministries, and service teams
- **Engage** the community through comments, reactions, questions, and discussions
- **Manage** members, permissions, and content from a professional admin dashboard
- **Communicate** at scale through targeted email campaigns and newsletters

Whether you are a church member looking to engage with your community online, a staff member managing content, or a developer running the platform — this README has everything you need.

---

## Table of Contents

1. [Who Is This For?](#1-who-is-this-for)
2. [Features at a Glance](#2-features-at-a-glance)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Platform Walkthrough](#4-platform-walkthrough)
5. [Technology Overview](#5-technology-overview)
6. [Project Structure](#6-project-structure)
7. [Getting Started](#7-getting-started)
8. [Environment Variables](#8-environment-variables)
9. [API Reference](#9-api-reference)
10. [Deployment](#10-deployment)
11. [Design Principles](#11-design-principles)
12. [Project Status & Roadmap](#12-project-status--roadmap)
13. [Security](#13-security)
14. [Contributing](#14-contributing)
15. [License](#15-license)

---

## 1. Who Is This For?

This platform serves a wide range of people. Here is how each group benefits:

| Who | How They Use It |
|---|---|
| **Congregation Members / Visitors** | Browse sermons and content, explore ministries, register for events |
| **Registered Members** | React to posts, join discussions, ask questions, access member-only areas |
| **Church Staff / Content Team** | Create and publish spiritual content, manage sermon series |
| **Church Administrators** | Full platform management — users, content, campaigns, settings |
| **UI/UX Designers** | Enterprise-grade admin UI (Stripe/Vercel quality), Tailwind-based public pages |
| **Frontend Developers** | React 18 + TypeScript, custom design system, role-aware routing |
| **Backend Developers** | Django 5 REST API, JWT auth, PostgreSQL, Celery task queue |
| **DevOps Engineers** | Docker Compose stack, multi-stage builds, Nginx, health checks |
| **Church Administrators (non-tech)** | Clean, guided admin dashboard — no coding required to manage content or users |

---

## 2. Features at a Glance

### For the Congregation (No Account Needed)

- 📖 Browse **sermons, articles, devotionals, and announcements**
- 🎬 Explore **sermon series** with organized, sequential content
- 🗓️ View **upcoming church events** with location and capacity details
- 🤝 Discover **ministry groups and service teams** to get involved with
- 🔍 Search and filter all content by topic, type, or speaker

### For Registered Members

- ❤️ **React to content** — Like, Amen, Love, Insight, and Praise reactions
- 💬 **Comment and reply** in threaded discussions on any post
- 🙋 **Ask questions** that church staff can answer and resolve
- 🏠 Access a **personalized member dashboard** with activity overview
- 🔔 Control your **email notification preferences** per content type
- ✅ Secure **email verification** and profile management

### For Church Staff & Content Creators

- ✍️ **Rich-text content editor** — write, format, embed media (audio/video/images)
- 📚 **Sermon series management** — organize posts in ordered, sequential series
- 🗂️ **Draft auto-save** — never lose work; manage drafts separately from published content
- 🕐 **Scheduled publishing** — plan content releases in advance
- 🎙️ Media support — audio URLs, video URLs, featured images per post

### For Church Administrators

- 📊 **Admin dashboard** — platform-wide metrics: posts, users, engagement, campaigns
- 👥 **User management** — view members, change roles, suspend/reactivate accounts
- 🛡️ **Content moderation** — review flagged comments, answer questions, manage reports
- 📧 **Email campaigns** — send targeted newsletters to members or all subscribers
- ⚙️ **Custom content types** — create new content categories beyond built-in types
- 📋 **Audit trail** — full log of all administrative actions

---

## 3. User Roles & Permissions

Access is controlled at every level — from the UI down to the API. Four roles exist:

| Capability | Visitor | Member | Moderator | Admin |
|---|:---:|:---:|:---:|:---:|
| Browse public content | ✅ | ✅ | ✅ | ✅ |
| View event listings | ✅ | ✅ | ✅ | ✅ |
| Register / log in | ✅ | ✅ | ✅ | ✅ |
| React to posts | — | ✅ | ✅ | ✅ |
| Comment on posts | — | ✅ | ✅ | ✅ |
| Ask & view questions | — | ✅ | ✅ | ✅ |
| Access member dashboard | — | ✅ | ✅ | ✅ |
| Create & edit content | — | — | ✅ (own) | ✅ (all) |
| Moderate comments & Q&A | — | — | ✅ | ✅ |
| Manage all users | — | — | — | ✅ |
| Send email campaigns | — | — | — | ✅ |
| Change user roles | — | — | — | ✅ |
| Access app settings | — | — | — | ✅ |
| View audit logs | — | — | — | ✅ |

> **Note:** All role checks are enforced at the API level, not just the frontend. Even if someone bypasses the UI, the backend will deny unauthorized requests.

---

## 4. Platform Walkthrough

### Public Website

The public-facing site is accessible to anyone without logging in.

| Page | URL | Description |
|---|---|---|
| Home | `/` | Hero section, latest sermon series, community impact stats, content archive |
| Library | `/library` | Browse all published content — filter by topic, type, or speaker |
| Sermon Series | `/library/series` | Explore organized sermon series in sequential order |
| Content Detail | `/content/:id` | Full post view with reactions, comments, and Q&A |
| Connect | `/connect` | Ministry groups, small groups, and service teams |
| Events | `/events` | Upcoming church events with date, location, and capacity |
| Register | `/register` | Create a free member account |
| Login | `/login` | Sign in to your account |

### Member Area

Accessible to registered, email-verified members at `/member`.

| Section | What You Can Do |
|---|---|
| Overview | See your activity summary, quick navigation cards |
| Sermons | Access sermon library and media content *(expanding)* |
| Events | View upcoming events from a member perspective *(expanding)* |
| Community | Participate in community discussions *(expanding)* |
| Prayer | Share and pray for prayer requests *(expanding)* |
| Profile | Edit your name, email, profile picture, and notification preferences |

### Admin Dashboard

Accessible to church staff and administrators at `/admin`. Login via `/admin-auth`.

| Section | URL | Access |
|---|---|---|
| Dashboard | `/admin` | Moderator + Admin |
| Posts & Sermons | `/admin/content` | Moderator + Admin |
| Sermon Series | `/admin/series` | Moderator + Admin |
| Post Drafts | `/admin/drafts` | Moderator + Admin |
| Podcasting | `/admin/podcasting` | Moderator + Admin |
| Member Directory | `/admin/users` | Admin only |
| Moderation | `/admin/moderation` | Moderator + Admin |
| Small Groups | `/admin/small-groups` | Moderator + Admin |
| Prayer Wall | `/admin/prayer-wall` | Moderator + Admin |
| Events Calendar | `/admin/events` | Moderator + Admin |
| Volunteers | `/admin/volunteers` | Moderator + Admin |
| Email Campaigns | `/admin/email` | Admin only |
| Reports | `/admin/reports` | Admin only |
| Settings | `/admin/settings` | Admin only |

---

## 5. Technology Overview

You do not need to know any of this to use the platform. This section is for developers and technical reviewers.

### Frontend

| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework with full type safety |
| React Router v6 | Page navigation and protected routes |
| Tailwind CSS | Styling on all public-facing pages |
| Custom CSS Design System | Admin dashboard styling (CSS custom properties) |
| Axios | API communication layer |
| React Quill | Rich-text content editor (WYSIWYG) |
| Lucide React | Icon system |
| DOMPurify | Sanitizes HTML to prevent XSS attacks |
| Context API | Global state (auth, toast notifications, confirm dialogs) |

### Backend

| Technology | Purpose |
|---|---|
| Python 3.11 + Django 5 | Core web framework |
| Django REST Framework | REST API with serializers and permissions |
| PostgreSQL 14+ | Primary production database |
| JWT (SimpleJWT) | Stateless authentication (60-min access, 24-hr refresh) |
| Celery + Redis | Background tasks (email sending, scheduled publishing) |
| Gunicorn | WSGI production server |
| Whitenoise | Static file serving (serves the React app) |
| drf-spectacular | Auto-generated OpenAPI / Swagger documentation |
| Pillow | Image processing |

### Infrastructure

| Component | Technology |
|---|---|
| Containerization | Docker (multi-stage build) |
| Orchestration | Docker Compose (web + db + redis + celery) |
| Reverse Proxy | Nginx |
| Deployment | Single-container or Docker Compose stack |

---

## 6. Project Structure

```
church-digital-platform/
│
├── backend/                    # Django API server
│   ├── config/                 # Settings, ASGI, Celery config, middleware
│   ├── apps/
│   │   ├── users/              # Accounts, authentication, email verification, JWT
│   │   ├── content/            # Posts, drafts, content types, uploads
│   │   ├── interactions/       # Comments (threaded), reactions, questions
│   │   ├── series/             # Sermon series with ordered post sequences
│   │   ├── email_campaigns/    # Email campaigns, subscriber preferences, delivery logs
│   │   └── moderation/         # Audit log, content reports, flagging
│   ├── tests/                  # Automated backend tests
│   ├── scripts/                # Utility / setup scripts
│   ├── manage.py
│   └── requirements.txt
│
├── src/                        # React frontend (TypeScript)
│   ├── public/                 # Public-facing pages (Home, Library, Events, Connect, etc.)
│   ├── member/                 # Authenticated member area
│   ├── admin/                  # Admin dashboard (content, users, moderation, settings)
│   ├── auth/                   # Auth context, login guards, token management
│   ├── components/             # Shared UI components (DataTable, RichTextEditor, Toast, etc.)
│   ├── services/               # API service modules (one per domain)
│   ├── router/                 # AppRouter — all routes defined here
│   ├── contexts/               # React Contexts (Auth, Toast, Confirm)
│   ├── hooks/                  # Custom React hooks
│   ├── styles/                 # Global CSS, Tailwind base
│   └── types/                  # TypeScript type definitions
│
├── public/                     # Static HTML entry point
├── docker-compose.yml          # Full-stack Docker orchestration
├── Dockerfile                  # Multi-stage build (Node → Python)
├── nginx.conf                  # Nginx reverse proxy config
├── package.json                # Frontend dependencies
├── tailwind.config.js          # Tailwind configuration
└── instruction.md              # Developer guidelines and coding standards
```

---

## 7. Getting Started

### Option A — Docker (Recommended)

The fastest way to run the full platform locally. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Clone the repository
git clone <repository-url>
cd church-digital-platform

# 2. Create your environment file
cp .env.example .env.production
# Open .env.production and fill in your values (see Section 8 below)

# 3. Start all services (database, Redis, Celery, web server)
docker-compose up -d

# 4. Run database migrations
docker-compose exec web python backend/manage.py migrate

# 5. Create your first admin account
docker-compose exec web python backend/manage.py createsuperuser

# 6. Open the platform
#    Website:      http://localhost:8000/
#    Admin panel:  http://localhost:8000/admin-auth
#    API docs:     http://localhost:8000/api/v1/docs/
```

To stop all services:
```bash
docker-compose down
```

---

### Option B — Local Development

If you prefer running the backend and frontend separately during development.

**Prerequisites:**
- Python 3.11 or higher
- Node.js 18+ and npm
- PostgreSQL 14+ *(or use SQLite for quick local testing)*
- Git

**Step 1 — Backend**

```bash
cd backend

# Create and activate a Python virtual environment
python -m venv ../venv

# Windows
..\venv\Scripts\activate
# macOS / Linux
source ../venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials, secret key, and email config

# Run database migrations
python manage.py migrate

# Create your admin account
python manage.py createsuperuser

# Start the backend server
python manage.py runserver
```

Backend API is now available at: `http://localhost:8000/api/v1/`

**Step 2 — Frontend**

Open a new terminal window:

```bash
# From project root
npm install

# Start the React development server
npm start
```

Frontend is now available at: `http://localhost:3000`

> The React dev server proxies API requests to `http://localhost:8000` automatically.

---

## 8. Environment Variables

### Backend — `backend/.env`

| Variable | Required | Description |
|---|:---:|---|
| `SECRET_KEY` | ✅ | Django secret key — use a long, random string |
| `DEBUG` | ✅ | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | ✅ | Comma-separated list of allowed hostnames (e.g. `localhost,yourdomain.com`) |
| `DATABASE_URL` | ✅ | Full PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/dbname`) |
| `REDIS_URL` | ✅ | Redis connection string (e.g. `redis://localhost:6379/0`) |
| `EMAIL_HOST` | ✅ | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | ✅ | SMTP port (usually `587`) |
| `EMAIL_USE_TLS` | ✅ | `True` for TLS-enabled SMTP |
| `EMAIL_HOST_USER` | ✅ | SMTP account email address |
| `EMAIL_HOST_PASSWORD` | ✅ | SMTP account password or app-specific password |
| `DEFAULT_FROM_EMAIL` | — | Sender name/email shown to recipients |
| `CORS_ALLOWED_ORIGINS` | ✅ | Frontend origin(s) allowed to call the API |
| `JWT_SECRET_KEY` | — | Separate JWT signing key (falls back to `SECRET_KEY` if unset) |

### Frontend — `.env` (project root)

| Variable | Required | Description |
|---|:---:|---|
| `REACT_APP_API_BASE_URL` | ✅ | Backend API base URL (e.g. `http://localhost:8000/api/v1`) |

---

## 9. API Reference

The API is fully versioned and self-documented. When the backend server is running, visit:

> **`http://localhost:8000/api/v1/docs/`** — Interactive Swagger UI (explore and test every endpoint)

All endpoints are prefixed with `/api/v1/`. Key groups:

| Group | Base Path | What It Covers |
|---|---|---|
| Authentication | `/api/v1/auth/` | Register, login, logout, token refresh, email verification |
| Admin Auth | `/api/v1/admin-auth/` | Separate login flow for staff and administrators |
| Public Content | `/api/v1/public/` | Browse posts, series, homepage data (no auth needed) |
| Comments | `/api/v1/comments/` | Threaded comments and questions (auth required) |
| Reactions | `/api/v1/posts/:id/reaction/` | Add or toggle a reaction on a post |
| Admin Content | `/api/v1/admin/content/` | Create, edit, publish, and delete posts (staff only) |
| Admin Series | `/api/v1/admin/series/` | Manage sermon series (staff only) |
| Admin Drafts | `/api/v1/admin/content/drafts/` | Save and retrieve post drafts |
| Admin Users | `/api/v1/admin/users/` | List, search, suspend, and manage users (admin only) |
| Admin Interactions | `/api/v1/admin/interactions/` | Moderation queue — comments, questions, flagged content |
| Email Campaigns | `/api/v1/admin/email/` | Create and send email campaigns (admin only) |
| App Settings | `/api/v1/admin/settings/` | Manage content types and platform settings |

> Authentication uses **JWT Bearer tokens**. Include `Authorization: Bearer <access_token>` in request headers for protected endpoints. Tokens are issued at login and expire after 60 minutes; refresh tokens last 24 hours.

---

## 10. Deployment

### Production with Docker Compose (Full Stack)

```bash
# Build and start all services
docker-compose up -d --build

# Apply migrations
docker-compose exec web python backend/manage.py migrate

# Collect static files
docker-compose exec web python backend/manage.py collectstatic --noinput

# Create admin user
docker-compose exec web python backend/manage.py createsuperuser
```

The `docker-compose.yml` starts four services:
- **`db`** — PostgreSQL 16 (data persisted in a named volume)
- **`redis`** — Redis 7 (Celery message broker)
- **`web`** — Django + React (Gunicorn, serves API and static files)
- **`celery`** — Celery worker (processes background jobs: email sending, scheduled publishing)

### Production Checklist

Before going live, confirm the following:

- [ ] `DEBUG=False` in environment
- [ ] Strong, unique `SECRET_KEY` (50+ random characters)
- [ ] `ALLOWED_HOSTS` set to your actual domain
- [ ] `CORS_ALLOWED_ORIGINS` set to your frontend origin
- [ ] PostgreSQL database provisioned and `DATABASE_URL` configured
- [ ] Redis URL configured
- [ ] SMTP email credentials set and verified
- [ ] SSL/TLS certificate in place (HTTPS)
- [ ] Nginx or load balancer configured as reverse proxy
- [ ] Logging and error monitoring (e.g. Sentry) set up
- [ ] Database backups scheduled

---

## 11. Design Principles

These principles guide every decision in the codebase:

1. **Backend is the single source of truth.** All data, permissions, and business logic live in the API. The frontend only presents — it never invents or bypasses.

2. **Security is built in, not bolted on.** Role checks are enforced at the API level on every endpoint. JWTs expire. Inputs are validated. Sensitive data stays in environment variables.

3. **No mock data, ever.** Every feature connects to real data. There are no hardcoded fixtures or demo shortcuts in any production code path.

4. **Calm, professional design.** The interface avoids flashy animations, distracting gradients, and decorative noise. The aesthetic goal is the same quality you would expect from enterprise tools like Stripe Dashboard or Vercel.

5. **Progressive complexity.** Simple things are simple. The platform works as a content site straight away. More powerful features (email campaigns, custom content types, audit logs) are there when needed.

6. **Accessibility matters.** Semantic HTML, ARIA labels, keyboard navigation, and sufficient color contrast are treated as requirements, not optional improvements.

---

## 12. Project Status & Roadmap

The platform is in active development. Core infrastructure is production-ready. Some newer features are complete on the backend and being implemented in the frontend.

### Live & Functional

| Feature | Status |
|---|---|
| Public content browsing (posts, series, events) | ✅ Live |
| Member registration, login, email verification | ✅ Live |
| Reactions (Like, Amen, Love, Insight, Praise) | ✅ Live |
| Threaded comments and Q&A | ✅ Live |
| Member profile and email preferences | ✅ Live |
| Admin dashboard with metrics | ✅ Live |
| Content management (create, edit, publish, draft, schedule) | ✅ Live |
| Sermon series management | ✅ Live |
| Draft auto-save system | ✅ Live |
| User management (roles, suspension, reactivation) | ✅ Live |
| Interaction moderation (comments, questions, flagged) | ✅ Live |
| Custom content type management | ✅ Live |
| Docker deployment | ✅ Live |

### In Progress / Coming Soon

| Feature | Status |
|---|---|
| Email campaigns — admin UI | 🔧 Backend complete, frontend in progress |
| Moderation reports & audit log — admin UI | 🔧 Backend complete, frontend in progress |
| Podcasting management | 🔧 Planned |
| Small Groups management | 🔧 Planned |
| Prayer Wall management | 🔧 Planned |
| Events Calendar management | 🔧 Planned |
| Volunteer management | 🔧 Planned |
| Member sermon/event/community sections | 🔧 Expanding |

---

## 13. Security

- **Authentication:** JWT with token rotation and blacklisting. Access tokens expire in 60 minutes; refresh tokens in 24 hours.
- **Authorization:** All endpoints enforce role-based permissions via Django REST Framework permission classes. Frontend route guards are a secondary layer only.
- **SQL Injection:** Not possible — all database access goes through Django's ORM.
- **XSS Protection:** User-generated HTML is sanitized with DOMPurify before rendering.
- **CORS:** Configured to allow only specified origins. No wildcard in production.
- **Secrets:** All sensitive values (keys, passwords, database URLs) are loaded from environment variables. Nothing is hardcoded.
- **Soft Deletes:** Content and user data is never permanently lost immediately — soft delete flags allow recovery and audit.
- **Audit Log:** Every administrative action (publish, delete, suspend, role change, etc.) is recorded with timestamp, actor, and affected resource.

To report a security vulnerability, contact the development team directly rather than opening a public issue.

---

## 14. Contributing

We welcome contributions. Before submitting code, please read [instruction.md](instruction.md) which covers:

- Coding standards and naming conventions
- Branching strategy (feature branches, naming patterns)
- Commit message format
- Security expectations for submitted code
- Code review process and standards

**General guidelines:**
- Frontend changes must not introduce TypeScript errors or ESLint warnings
- Backend changes must not break existing API contracts or test suites
- No mock data, no hardcoded values, no shortcuts in production code paths
- New features require tests

---

## 15. License

License terms are to be determined. Contact the project maintainers for usage rights and distribution terms.

---

<div align="center">

Built with care for churches and communities. &nbsp;·&nbsp; Questions? Contact the development team.

</div>
