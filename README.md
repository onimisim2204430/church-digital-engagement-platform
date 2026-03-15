# Church Digital Engagement Platform

> A complete digital home for your church community — where congregation members connect, content is delivered, and church staff manage everything from one place.

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)](https://church-digital-engagement-platform.onrender.com)
[![Backend](https://img.shields.io/badge/backend-Django%205%20%2B%20DRF-092E20)](https://www.djangoproject.com/)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20TypeScript-61DAFB)](https://react.dev/)
[![Real-Time](https://img.shields.io/badge/real--time-WebSocket%20%2B%20Channels-blue)](https://channels.readthedocs.io/)
[![Payments](https://img.shields.io/badge/payments-Paystack%20Integration-blueviolet)](https://paystack.com/)

---

## What Is This?

The **Church Digital Engagement Platform** is a production-grade, full-stack web application purpose-built for churches and faith-based organizations. It provides a single, unified digital space where:

- **Congregation Members** browse sermons, articles, devotionals, announcements, and events anytime, anywhere
- **Registered Members** connect with the community through reactions, comments, questions, and discussions
- **Church Staff** create and publish rich content with scheduling, drafting, and media management
- **Administrators** manage the entire platform — users, permissions, content, payments, and campaigns
- **Leadership** receives real-time notifications, audit trails, and detailed analytics
- **Donors** give securely through integrated payment processing

Whether you are a congregation member, church staff, or developer — this README has everything you need.

---

## Table of Contents

### 🙋 For Everyone
1. [Quick Start by Role](#1-quick-start-by-role)
2. [Who Is This For?](#2-who-is-this-for)
3. [What Can You Do? (Features)](#3-what-can-you-do-features)

### 🔐 Platform Details
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Platform Walkthrough](#5-platform-walkthrough)
6. [Real-Time Notifications](#6-real-time-notifications)
7. [Payment Processing](#7-payment-processing)

### 🔧 For Developers
8. [Technology Overview](#8-technology-overview)
9. [Project Structure](#9-project-structure)
10. [Getting Started (Development & Deployment)](#10-getting-started)
11. [Environment Variables](#11-environment-variables)
12. [API Reference](#12-api-reference)
13. [Deployment](#13-deployment)
14. [Design Principles](#14-design-principles)

### 📚 Reference
15. [Project Status & Roadmap](#15-project-status--roadmap)
16. [Security](#16-security)
17. [Contributing](#17-contributing)
18. [License](#18-license)

---

## 1. Quick Start by Role

### 👤 I'm a Congregation Member or Visitor
**Goal:** Browse sermons and announcements

1. Go to the **Home page** (`/`) — you don't need an account
2. Browse **Sermons** in the Library
3. Click on any sermon to read, listen, or watch
4. Want to comment or react? **Register** (free) at `/register`
5. After registration, verify your email and you're in the community!

**Key URLs:**
- 📖 Library (Browse content): `/library`
- 🎬 Sermon Series: `/library/series`
- 📅 Events: `/events`
- 🤝 Ministries: `/connect`

---

### 🙋 I'm a Registered Member
**Goal:** Interact with the community

1. **Log in** at `/login` with your email and password
2. Go to your **Member Dashboard** (`/member`)
3. Check your profile, notification preferences, and activity
4. Browse the **Sermon Library** and **comment** on content
5. **React** to posts (Like, Amen, Love, Insight, Praise)
6. **Ask questions** and engage in the community discussion
7. **Manage your notification settings** — choose what you get emailed about

**Coming Soon (Member Side):**
- Small group discussions
- Prayer wall
- Event registration
- Community messaging

---

### 👨‍💼 I'm Church Staff / Content Creator
**Goal:** Publish sermons, articles, and announcements

1. **Log in** at `/admin-auth` with your staff account
2. Go to **Admin Dashboard** (`/admin`)
3. Click **Posts & Sermons** or **Content** to start creating
4. Use the **rich-text editor** to write your post
5. Add a title, description, featured image, and media (audio/video)
6. **Save as Draft** (auto-saves every 30 seconds)
7. **Publish immediately** or **Schedule for later** (choose a future date/time)
8. **Organize series** — group related sermons together
9. **Moderate comments** — review, respond to, or delete comments
10. View **engagement metrics** on your dashboard

**Key Admin Sections:**
- 📝 Posts & Sermons (`/admin/content`)
- 📚 Sermon Series (`/admin/series`)
- 📋 Drafts (`/admin/drafts`)
- 💬 Moderation (`/admin/moderation`)
- 📊 Dashboard (`/admin`)

---

### 🔑 I'm an Administrator
**Goal:** Manage the entire platform

1. **Log in** at `/admin-auth` with your admin account
2. Go to **Admin Dashboard** (`/admin`) — you have access to everything
3. **Member Directory** — add, remove, promote, or suspend users
4. **Content Management** — manage all posts, series, and drafts
5. **Email Campaigns** — create newsletters and send to specific groups
6. **Settings** — customize content types, email templates, platform settings
7. **Audit Log** — see every action taken (who published, who changed what)
8. **Reports & Analytics** — engagement stats, member growth, content performance

**Admin-Only Features:**
- 👥 Member Directory & User Management (`/admin/users`)
- 📧 Email Campaigns (`/admin/email`)
- ⚙️ Platform Settings (`/admin/settings`)
- 📊 Reports & Analytics (`/admin/reports`)
- 🔍 Audit Log (`/admin/audit`)

---

### 💻 I'm a Developer
**Goal:** Set up and extend the platform

1. **Start here:** [Getting Started (Development)](#10-getting-started)
2. Read [Technology Overview](#8-technology-overview) to understand the stack
3. Explore the [API Reference](#12-api-reference) at `http://localhost:8000/api/v1/docs/`
4. Check [Contributing](#17-contributing) for coding standards
5. Deploy using [Deployment Guide](#13-deployment)

---

## 2. Who Is This For?

| Who | What They Get |
|---|---|
| **Congregation Members / Visitors** | A free, easy way to engage with church content, sermons, events, and community — no tech skills needed |
| **Registered Members** | A personalized experience with comments, reactions, discussions, notifications, and profile management |
| **Church Staff / Content Creators** | A professional, modern publishing platform with scheduling, drafts, analytics, and media management |
| **Church Administrators** | Complete control — user management, permissions, campaigns, settings, audit logs, and analytics |
| **Church Leadership** | Real-time notifications, member engagement metrics, content performance data, and audit trails |
| **Donors / Contributors** | A secure way to give financially through integrated payment processing with fraud protection |
| **UI/UX Designers** | Enterprise-grade admin UI (comparable to Stripe/Vercel quality) and professional public pages |
| **Frontend Developers** | Modern stack (React 18, TypeScript, Tailwind CSS, React Router, Axios) with role-aware routing |
| **Backend Developers** | Clean architecture (Django 5 REST API, JWT auth, PostgreSQL, Celery, WebSocket channels, audit logging) |
| **DevOps Engineers** | Production-ready Docker Compose stack with Nginx, multi-stage builds, Redis, and health checks |

---

## 3. What Can You Do? (Features)

### 📖 Content Discovery (Anyone, No Login Required)

- ✅ Browse all public **sermons, articles, devotionals, and announcements**
- ✅ Explore **sermon series** with organized, sequential content  
- ✅ View **upcoming events** with date, time, location, and capacity
- ✅ Discover **ministry groups and service teams**
- ✅ **Search and filter** content by topic, speaker, date, or type

### 💬 Community Engagement (Registered Members)

- ✅ **React to content** with 5 emoji reactions: Like ❤️, Amen 🙏, Love 💕, Insight 💡, Praise 🎉
- ✅ **Comment and reply** in threaded discussions under any post
- ✅ **Ask questions** that church staff can answer publicly
- ✅ **Receive answers** directly from moderators and staff
- ✅ **View member activity** — see what's happening in your community
- ✅ **Manage preferences** — control which notifications you receive and how

### 📝 Content Creation & Publishing (Church Staff +)

- ✅ **Rich-text editor** — write, format, add links, embed media (audio, video, images)
- ✅ **Draft management** — save work and come back later (auto-saves every 30 seconds)
- ✅ **Schedule publishing** — plan content to go live at specific dates/times
- ✅ **Sermon series** — organize related posts in sequential order
- ✅ **Media support** — upload images, add audio URLs, embed videos, featured images
- ✅ **Custom content types** — create new categories beyond built-in types
- ✅ **View engagement** — see reactions, comments, questions on your content
- ✅ **Publish immediately** or **queue for review** before going live

### 🛡️ Moderation & Community Management (Moderators +)

- ✅ **Moderate comments** — review, approve, edit, or delete comments
- ✅ **Manage Q&A** — answer questions publicly, mark as resolved
- ✅ **Review reports** — see flagged content and take action
- ✅ **Moderation dashboard** — queue of items waiting for review
- ✅ **Action audit trail** — see who moderated what and when

### 👥 User Management (Admins Only)

- ✅ **Member directory** — view all users, search by name/email
- ✅ **Change roles** — promote members to moderator or staff
- ✅ **Suspend accounts** — temporarily or permanently restrict access
- ✅ **Export data** — bulk export member information
- ✅ **Email verification** — ensure members verify email on signup
- ✅ **Activity tracking** — see member login history and engagement

### 📧 Email & Communication (Admins Only)

- ✅ **Email campaigns** — draft and send newsletters to all members or specific groups
- ✅ **Campaign templates** — save templates for recurring campaigns
- ✅ **Subscription management** — members can opt-in/out of emails
- ✅ **Delivery tracking** — see open rates, bounces, and engagement
- ✅ **Scheduled sending** — send campaigns at optimal times

### 💰 Payment Processing (Donors + Admins)

- ✅ **Secure donations** — members can donate through Paystack
- ✅ **Multiple amounts** — offer preset or custom donation amounts
- ✅ **Payment verification** — backend verifies all transactions with Paystack
- ✅ **Fraud detection** — automatic fraud prevention and rate limiting
- ✅ **Payment history** — donors see their transaction history
- ✅ **Instant notifications** — real-time notifications to donors and admins
- ✅ **Audit logging** — complete record of all payment events for compliance

### 📊 Admin Dashboard & Analytics

- ✅ **Platform overview** — total members, content published, engagement stats
- ✅ **Content metrics** — most viewed, most commented, engagement trends
- ✅ **Member growth** — new registrations, active users, retention
- ✅ **Email campaign stats** — open rates, click rates, bounces
- ✅ **Payment analytics** — donations received, transaction history
- ✅ **Audit log** — complete history of all administrative actions
- ✅ **Real-time updates** — see activity as it happens via WebSocket

### 🔔 Real-Time Notifications

- ✅ **Instant bell icon alerts** — notifications appear in real-time as you're logged in
- ✅ **Notification types** — payment success, content published, comment replies, questions answered
- ✅ **Unread badge** — see how many unread notifications you have
- ✅ **Email notifications** — receive email summaries of activity
- ✅ **Preference control** — choose which notifications you want by email
- ✅ **Mark as read** — clean up notifications
- ✅ **Automatic fallback** — notifications work even if real-time connection drops

---

## 4. User Roles & Permissions

Access is controlled at every level — from the UI down to the API. Four roles exist:

| Capability | Visitor | Member | Moderator | Admin |
|---|:---:|:---:|:---:|:---:|
| **Browse public content** | ✅ | ✅ | ✅ | ✅ |
| **View events** | ✅ | ✅ | ✅ | ✅ |
| **Search & filter** | ✅ | ✅ | ✅ | ✅ |
| **Register / log in** | ✅ | ✅ | ✅ | ✅ |
| **React to posts** | — | ✅ | ✅ | ✅ |
| **Comment on posts** | — | ✅ | ✅ | ✅ |
| **Ask questions** | — | ✅ | ✅ | ✅ |
| **Access member dashboard** | — | ✅ | ✅ | ✅ |
| **Create content** | — | — | ✅ | ✅ |
| **Edit own content** | — | — | ✅ | ✅ |
| **Edit all content** | — | — | — | ✅ |
| **Publish content** | — | — | ✅ | ✅ |
| **Delete content** | — | — | ✅ | ✅ |
| **Moderate comments & Q&A** | — | — | ✅ | ✅ |
| **Manage content types** | — | — | — | ✅ |
| **Manage all users** | — | — | — | ✅ |
| **Change user roles** | — | — | — | ✅ |
| **Suspend/reactivate users** | — | — | — | ✅ |
| **Send email campaigns** | — | — | — | ✅ |
| **Access settings** | — | — | — | ✅ |
| **View audit logs** | — | — | — | ✅ |
| **View analytics** | — | — | — | ✅ |

> **Note:** All role checks are enforced at the API level, not just the frontend. Even if someone bypasses the UI, the backend will deny unauthorized requests.

---

## 5. Platform Walkthrough

### Public Website

The public-facing site is accessible to anyone without logging in.

| Page | URL | Description |
|---|---|---|
| **Home** | `/` | Hero, latest sermons, community stats, featured content |
| **Library** | `/library` | Browse all published content — filter by topic, type, speaker |
| **Sermon Series** | `/library/series` | Explore organized sermon series in sequential order |
| **Content Detail** | `/content/:id` | Full post with reactions, comments, Q&A, media |
| **Connect** | `/connect` | Discover ministries, small groups, service teams |
| **Events** | `/events` | Upcoming events with date, location, capacity |
| **Register** | `/register` | Create a free member account |
| **Login** | `/login` | Sign in to your account |

### Member Dashboard

Accessible to registered, email-verified members at `/member`.

| Section | What You Can Do |
|---|---|
| **Dashboard** | View activity summary, unread notifications, quick links |
| **Sermons** | Access sermon library with your personal history |
| **Events** | View upcoming events from a member perspective |
| **Community** | Participate in discussions and see member activity |
| **Profile** | Edit name, email, picture, and notification preferences |
| **Notifications** | See all your notifications and mark as read |
| **Prayer** | Share and pray for prayer requests *(coming soon)* |

### Admin Dashboard

Accessible to moderators and admins at `/admin`. Login via `/admin-auth`.

| Section | URL | Access |
|---|---|---|
| **Dashboard Overview** | `/admin` | Moderator + Admin |
| **Posts & Sermons** | `/admin/content` | Moderator + Admin |
| **Sermon Series** | `/admin/series` | Moderator + Admin |
| **Post Drafts** | `/admin/drafts` | Moderator + Admin |
| **Moderation Queue** | `/admin/moderation` | Moderator + Admin |
| **Member Directory** | `/admin/users` | Admin only |
| **Email Campaigns** | `/admin/email` | Admin only |
| **Settings** | `/admin/settings` | Admin only |
| **Audit Log** | `/admin/audit` | Admin only |
| **Reports** | `/admin/reports` | Admin only |
| **Small Groups** | `/admin/small-groups` | Moderator + Admin *(coming soon)* |
| **Events** | `/admin/events` | Moderator + Admin *(coming soon)* |
| **Podcasting** | `/admin/podcasting` | Moderator + Admin *(coming soon)* |

---

## 6. Real-Time Notifications

The platform uses **WebSocket technology** for instant, real-time notifications — no need to refresh the page.

### How It Works

When something happens (e.g., payment received, comment reply, content published), you're notified **instantly** via:
- 🔔 **Bell icon** in the navbar lights up with the unread count
- 📲 **Notification center** shows all your recent notifications
- 📧 **Email digest** (optional) summarizes activity

### Features

- ✅ **Real-time delivery** — notifications appear instantly as you're logged in
- ✅ **Persistent database** — notifications saved so you can read them later
- ✅ **User isolation** — you only see your own notifications
- ✅ **Automatic fallback** — works even if the real-time connection drops
- ✅ **mark as read** — keep your notification center clean
- ✅ **Preference control** — choose which types you get emailed about

### Notification Types

- 📧 **Payment Successful** — Your donation was processed
- 📝 **Content Published** — Content you created is now live
- 💬 **Comment Reply** — Someone replied to your comment
- ❓ **Question Answered** — Your question was answered
- 👍 **New Reaction** — Someone reacted to your post
- 📢 **New Announcement** — Sent by church leadership

---

## 7. Payment Processing

The platform integrates **Paystack** for secure, reliable payment processing. This is perfect for:
- Church **donations** (one-time or recurring)
- **Fundraising** campaigns
- **Event registration** with fees
- **Membership tiers**

### How Payments Work

1. **Member initiates donation** — clicks "Donate" and enters amount
2. **Payment intent created** — system verifies user and creates a pre-authorization token
3. **Fraud check** — automatic detection of suspicious patterns (rate limiting, IP analysis)
4. **Redirect to Paystack** — secure checkout with card/bank options
5. **Payment processed** — Paystack handles the transaction securely
6. **Webhook callback** — Paystack notifies the platform of the result
7. **Signature verification** — platform verifies the webhook using cryptographic signing
8. **Amount validation** — platform confirms the exact amount matches what was authorized
9. **Real-time notification** — donor and admin both notified instantly
10. **Audit logged** — complete record stored for compliance

### Security Features

- ✅ **Fraud detection** — Automatic rate-limiting and IP tracking
- ✅ **Signature verification** — Webhooks verified with HMAC SHA512
- ✅ **Amount validation** — Backend verifies exact amount with Paystack
- ✅ **Intent expiry** — Pre-authorized intents expire after 30 minutes
- ✅ **Audit trail** — Every payment event logged and auditable
- ✅ **PCI compliance** — Paystack handles card data securely (platform never sees cards)

### For Admins

- 📊 **Payment dashboard** — view all donations with amounts and dates
- 📧 **Instant notifications** — get alerted when payments succeed or fail
- 💾 **Payment history** — exportable list of all transactions
- 📋 **Audit log** — see every payment step (intent creation, verification, webhook)
- 🔍 **Fraud alerts** — suspicious activity flagged automatically

---

## 8. Technology Overview

You don't need to understand this to use the platform. This section is for developers and technical reviewers.

### Frontend

| Technology | Purpose | Why? |
|---|---|---|
| React 18 + TypeScript | UI framework with full type safety | Modern, scalable, catches errors at compile time |
| React Router v6 | Page navigation and protected routes | Role-aware routing ensures users can only access permitted areas |
| Tailwind CSS | Styling for public-facing pages | Utility-first CSS framework — fast, responsive, maintainable |
| Custom Design System | Admin dashboard styling | Enterprise-quality UI with CSS custom properties |
| Axios | HTTP API client with interceptors | Automatic token refresh, error handling, request/response logging |
| React Quill | Rich-text content editor (WYSIWYG) | Industry-standard editor used by Medium, Notion, etc. |
| Lucide React | Icon library | 450+ professionally-designed icons |
| DOMPurify | HTML sanitization | Prevents XSS attacks by stripping malicious code from user input |
| Context API | Global state (auth, toast, dialogs) | Native React solution for app-wide state |
| IndexedDB (idb library) | Browser-side caching | Stores data locally for offline access and performance |

### Backend

| Technology | Purpose | Why? |
|---|---|---|
| Python 3.11 | Programming language | Readability, strong standard library, great ecosystem |
| Django 5 | Web framework | Production-grade, 20+ years of maturity, built-in security |
| Django REST Framework | REST API toolkit | Makes building APIs fast, with permissions, pagination, serialization |
| PostgreSQL 14+ | Primary database | ACID transactions, full-text search, JSON support, reliability |
| JWT (SimpleJWT) | Token-based authentication | Stateless, scalable, works with microservices |
| Celery | Task queue | Async/delayed tasks (email, scheduled publishing, maintenance jobs) |
| Redis | Message broker & cache | Fast, in-memory, supports pub/sub for real-time features |
| Django Channels | WebSocket support | Real-time notifications and bidirectional communication |
| Daphne | ASGI server | Runs Django + channels + WebSocket |
| Gunicorn | WSGI server | Production application server |
| Whitenoise | Static file serving | Serves the React build as part of Django |
| drf-spectacular | API documentation | Auto-generates OpenAPI 3.0 spec and interactive Swagger UI |
| Pillow | Image processing | Handles image uploads, resizing, optimization |

### Infrastructure

| Component | Technology | Why? |
|---|---|---|
| **Containerization** | Docker | Consistent environment across dev, staging, production |
| **Multi-stage builds** | Docker | Reduces image size by stripping out dev dependencies |
| **Container orchestration** | Docker Compose | Simple way to run web + database + redis + celery together |
| **Reverse proxy** | Nginx | Fast, handles SSL/TLS, compresses responses, serves static files |
| **Static file serving** | Whitenoise | Avoids need for separate static file server |
| **Secrets management** | Environment variables | 12-factor app approach — never hardcode secrets |

### External Services

| Service | Purpose |
|---|---|
| **Paystack** | Payment processing (donations, giving, fundraising) |
| **SMTP Server** | Email delivery (registration, notifications, campaigns) |
| **DNS / CDN** (optional) | Domain management and content delivery |

---

## 9. Project Structure

```
church-digital-platform/
│
├── backend/                           # Django REST API
│   ├── config/                        # Settings, ASGI, URLs, middleware
│   │   ├── settings.py                # Django configuration
│   │   ├── asgi.py                    # ASGI app (Daphne, channels)
│   │   ├── wsgi.py                    # WSGI app (Gunicorn)
│   │   ├── urls.py                    # API routes
│   │   └── celery.py                  # Celery configuration
│   │
│   ├── apps/
│   │   ├── users/                     # Authentication, profiles, JWT
│   │   │   ├── models.py              # User model, profile
│   │   │   ├── views.py               # Register, login, email verification
│   │   │   ├── serializers.py         # User serializers
│   │   │   └── urls.py                # Auth endpoints
│   │   │
│   │   ├── content/                   # Posts, sermons, articles, drafts
│   │   │   ├── models.py              # Content, ContentType, Draft, Schedule
│   │   │   ├── views.py               # CRUD operations
│   │   │   ├── serializers.py         # Content serializers
│   │   │   └── urls.py                # Content endpoints
│   │   │
│   │   ├── series/                    # Sermon series management
│   │   │   ├── models.py              # Series, series ordering
│   │   │   ├── views.py               # Series CRUD
│   │   │   └── serializers.py         # Series serializers
│   │   │
│   │   ├── interactions/              # Comments, reactions, Q&A
│   │   │   ├── models.py              # Comment, Reaction, Question
│   │   │   ├── views.py               # Threaded comments, reactions
│   │   │   └── serializers.py         # Comment serializers
│   │   │
│   │   ├── notifications/             # Real-time & email notifications
│   │   │   ├── models.py              # Notification, UserPreferences
│   │   │   ├── consumers.py           # WebSocket consumer (Channels)
│   │   │   ├── services.py            # Notification service
│   │   │   ├── views.py               # Notification REST endpoints
│   │   │   ├── routing.py             # WebSocket routes
│   │   │   └── urls.py                # Notification endpoints
│   │   │
│   │   ├── payments/                  # Paystack integration
│   │   │   ├── models.py              # PaymentTransaction, PaymentIntent, PaymentAuditLog
│   │   │   ├── views.py               # Initialize payment, webhook
│   │   │   ├── services.py            # Payment logic
│   │   │   ├── webhooks.py            # Paystack webhook handler
│   │   │   ├── utils.py               # Signature verification, fraud detection
│   │   │   └── urls.py                # Payment endpoints
│   │   │
│   │   ├── email_campaigns/           # Email marketing
│   │   │   ├── models.py              # Campaign, EmailTemplate, Subscription
│   │   │   ├── views.py               # Campaign CRUD, send
│   │   │   ├── tasks.py               # Celery tasks for sending
│   │   │   └── urls.py                # Campaign endpoints
│   │   │
│   │   ├── moderation/                # Content flagging, audit logs
│   │   │   ├── models.py              # AuditLog, ContentFlag, reports
│   │   │   ├── views.py               # Moderation queue, actions
│   │   │   └── urls.py                # Moderation endpoints
│   │   │
│   │   └── ...other apps
│   │
│   ├── tests/                         # Automated tests
│   ├── migrations/                    # Database migrations
│   ├── manage.py                      # Django CLI
│   ├── requirements.txt                # Python dependencies
│   └── .env.example                   # Template for environment variables
│
├── src/                               # React frontend (TypeScript)
│   ├── public/                        # Public-facing pages
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Homepage
│   │   │   ├── Library.tsx            # Content library
│   │   │   ├── SeriesList.tsx         # Sermon series
│   │   │   ├── ContentDetail.tsx      # Post detail view
│   │   │   ├── Connect.tsx            # Ministries
│   │   │   ├── Events.tsx             # Events page
│   │   │   └── ...other pages
│   │   └── components/
│   │       ├── ContentCard.tsx       # Reusable content card
│   │       ├── SearchBar.tsx         # Search component
│   │       └── ...other components
│   │
│   ├── member/                        # Member dashboard (authenticated)
│   │   ├── pages/
│   │   │   ├── MemberDashboard.tsx   # Member home
│   │   │   ├── NotificationCenter.tsx # Notifications view
│   │   │   ├── SermonLibrary.tsx     # Member sermon library
│   │   │   └── ...other pages
│   │   └── components/
│   │       └── ...components
│   │
│   ├── admin/                         # Admin dashboard (auth required, roles enforced)
│   │   ├── Dashboard.tsx              # Overview metrics
│   │   ├── ContentManagement.tsx      # Create, edit, publish posts
│   │   ├── UserManagement.tsx         # Users, roles, suspension
│   │   ├── EmailCampaigns.tsx         # Campaigns & templates
│   │   ├── Moderation.tsx             # Moderation queue
│   │   ├── Settings.tsx               # Platform settings
│   │   ├── AuditLog.tsx               # Audit log viewer
│   │   ├── PaymentDashboard.tsx       # Payment analytics
│   │   └── ...other pages
│   │
│   ├── auth/                          # Authentication
│   │   ├── contexts/                  # Auth context
│   │   ├── hooks/                     # useAuth hook
│   │   ├── services/                  # API service for auth
│   │   └── ...auth logic
│   │
│   ├── components/                    # Shared components
│   │   ├── RichTextEditor.tsx         # Quill editor wrapper
│   │   ├── DataTable.tsx              # Reusable data table
│   │   ├── NotificationBell.tsx       # Real-time notification bell
│   │   ├── ConfirmDialog.tsx          # Confirmation dialogs
│   │   ├── Toast.tsx                  # Toast notifications
│   │   └── ...other components
│   │
│   ├── services/                      # API service layers
│   │   ├── auth.ts                    # Auth API endpoints
│   │   ├── content.ts                 # Content API endpoints
│   │   ├── payments.ts                # Payment API endpoints
│   │   ├── notifications.ts           # Notification API endpoints
│   │   └── ...other services
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useAuth.ts                 # Authentication hook
│   │   ├── useWebSocketNotifications.ts # WebSocket notifications
│   │   ├── useAsync.ts                # Async operation hook
│   │   └── ...other hooks
│   │
│   ├── router/                        # Routes
│   │   └── AppRouter.tsx              # All routes defined here
│   │
│   ├── contexts/                      # React contexts
│   │   ├── AuthContext.tsx            # Auth state
│   │   ├── ToastContext.tsx           # Toast notifications
│   │   └── ConfirmContext.tsx         # Confirm dialogs
│   │
│   ├── types/                         # TypeScript types
│   │   ├── models.ts                  # Data models
│   │   ├── api.ts                     # API response types
│   │   └── ...other types
│   │
│   ├── styles/                        # Global styles
│   │   ├── globals.css                # Reset, variables, base
│   │   └── tailwind.css               # Tailwind imports
│   │
│   └── App.tsx & index.tsx            # App entry point
│
├── public/                            # Static files
│   ├── index.html                     # React entry point
│   ├── favicon.ico
│   └── ...other static files
│
├── docker-compose.yml                 # Full-stack orchestration
├── Dockerfile                         # Multi-stage build
├── nginx.conf                         # Reverse proxy configuration
├── package.json                       # Frontend dependencies
├── tailwind.config.js                 # Tailwind configuration
├── tsconfig.json                      # TypeScript configuration
├── .env.example                       # Template for frontend env vars
│
└── instruction.md                     # Developer guidelines & standards

```

---

## 10. Getting Started

Choose your path:

### Option A: Docker (Recommended for Everyone)

The fastest way to run the full platform locally. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Clone the repository
git clone <repository-url>
cd church-digital-platform

# 2. Create your environment file
cp .env.example .env.production
# Open .env.production and fill in values:
# - SECRET_KEY: long random string
# - DATABASE_URL: usually postgresql://user:pass@db:5432/church
# - PAYSTACK_SECRET_KEY: your Paystack test/live key
# - etc. (see Section 11 below)

# 3. Start all services
docker-compose up -d

# 4. Run migrations
docker-compose exec web python backend/manage.py migrate

# 5. Create admin account
docker-compose exec web python backend/manage.py createsuperuser

# 6. Load with sample data (optional)
docker-compose exec web python backend/manage.py loaddata initial_data

# 7. Access the platform
#    Website:     http://localhost:8000
#    Admin:       http://localhost:8000/admin-auth
#    API docs:    http://localhost:8000/api/v1/docs/
```

To stop all services:
```bash
docker-compose down
```

To view logs:
```bash
docker-compose logs -f web        # Frontend + Backend logs
docker-compose logs -f db         # Database logs
docker-compose logs -f redis      # Redis logs
docker-compose logs -f celery     # Celery worker logs
```

---

### Option B: Local Development

For developers who prefer running services separately.

**Prerequisites:**
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (or SQLite for local testing)
- Redis 7+
- Git

**Step 1: Backend Setup**

```bash
cd backend

# Create Python virtual environment
python -m venv ../venv

# Activate (Windows)
..\venv\Scripts\activate
# Or (macOS/Linux)
source ../venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your values (database, keys, email, etc.)

# Run migrations
python manage.py migrate

# Create admin account
python manage.py createsuperuser

# Start backend server
python manage.py runserver
```

Backend is now at: `http://localhost:8000/api/v1/`

**Step 2: Frontend Setup**

Open a new terminal from the project root:

```bash
# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_BASE_URL=http://localhost:8000/api/v1" > .env

# Start React dev server
npm start
```

Frontend is now at: `http://localhost:3000` (auto-proxies to backend)

**Step 3: Celery (Optional but Recommended)**

For background tasks (email sending, scheduled publishing):

```bash
# Ensure Redis is running first

# Terminal 3: Start Celery worker
cd backend
celery -A config worker -l info --pool=threads

# Terminal 4: Start Celery Beat (scheduler)
cd backend
celery -A config beat -l info
```

---

### Option C: Production Deployment

See [Section 13: Deployment](#13-deployment) below.

---

## 11. Environment Variables

### Backend — `backend/.env`

**CRITICAL:** Keep `.env` secret! Add to `.gitignore` and **never commit** to version control.

| Variable | Required | Example | Description |
|---|:---:|---|---|
| `SECRET_KEY` | ✅ | `django-insecure-abc123xyz...` | Django secret key — generate with `django-admin shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | ✅ | `False` | Set to `False` in production, `True` in development |
| `ALLOWED_HOSTS` | ✅ | `localhost,127.0.0.1,yourdomain.com` | Comma-separated list of allowed domains |
| `DATABASE_URL` | ✅ | `postgresql://user:pass@localhost:5432/church` | Full PostgreSQL connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379/0` | Redis connection string |
| `EMAIL_HOST` | ✅ | `smtp.gmail.com` | SMTP server for sending emails |
| `EMAIL_PORT` | ✅ | `587` | SMTP port (usually 587 for TLS) |
| `EMAIL_USE_TLS` | ✅ | `True` | Enable TLS encryption |
| `EMAIL_HOST_USER` | ✅ | `your-email@gmail.com` | SMTP account email |
| `EMAIL_HOST_PASSWORD` | ✅ | `app-specific-password` | SMTP account password (use app-specific password for Gmail) |
| `DEFAULT_FROM_EMAIL` | — | `noreply@yourdomain.com` | "From" name/email in emails sent |
| `CORS_ALLOWED_ORIGINS` | ✅ | `http://localhost:3000,https://yourdomain.com` | Frontend URL(s) allowed to call the API |
| `JWT_SECRET_KEY` | — | (auto-uses SECRET_KEY) | Optional: separate JWT signing key |
| **Payment Configuration** |
| `PAYSTACK_PUBLIC_KEY` | ✅ | `pk_test_8bd23795b032...` | Paystack public key (test or live) |
| `PAYSTACK_SECRET_KEY` | ✅ | `sk_test_635e1263d362...` | Paystack secret key (test or live) |
| `PAYSTACK_WEBHOOK_SECRET` | ✅ | `Y7gf3AGqSqfTEF...` | Webhook signing secret (use `secrets.token_urlsafe(32)`) |

### Frontend — `.env` (project root)

| Variable | Required | Example | Description |
|---|:---:|---|---|
| `REACT_APP_API_BASE_URL` | ✅ | `http://localhost:8000/api/v1` | Backend API base URL |
| `REACT_APP_WS_URL` | — | `ws://localhost:8000/ws` | WebSocket server URL (auto-constructed if omitted) |

### Docker Environment

When using Docker, environment variables can be set in `.env.production`:

```env
# Core Django
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,your-domain.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com

# Database
DATABASE_URL=postgresql://pguser:pgpass@db:5432/church_db

# Redis
REDIS_URL=redis://redis:6379/0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=your-webhook-secret

# Default from email
DEFAULT_FROM_EMAIL=noreply@yourchurch.com
```

Then reference in `docker-compose.yml`:
```yaml
env_file:
  - .env.production
```

---

## 12. API Reference

The API is fully documented and self-testing. When your backend is running, visit:

### 📚 Interactive API Documentation

> **`http://localhost:8000/api/v1/docs/`** — Swagger UI (explore and test every endpoint)

All endpoints are prefixed with `/api/v1/`.

### Authentication

Most endpoints require JWT authentication. Include the token in your request header:

```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8000/api/v1/admin/content/
```

**Getting a token:**
1. POST to `/api/v1/auth/login/` with email and password
2. Response contains `access` and `refresh` tokens
3. Token expires after 60 minutes; use `refresh` token to get a new one

### API Endpoints by Group

| Group | Base | Purpose |
|---|---|---|
| **Authentication** | `/api/v1/auth/` | Register, login, logout, token refresh, email verification, password reset |
| **Admin Auth** | `/api/v1/admin-auth/` | Staff/admin-only login, token management |
| **Public Content** | `/api/v1/public/` | Browse posts, series, homepage, search (public — no auth needed) |
| **Member Profile** | `/api/v1/me/` | Current user profile, preferences, settings |
| **Comments** | `/api/v1/comments/` | Post comments, threaded replies, delete (auth required) |
| **Reactions** | `/api/v1/reactions/` | Add/remove reactions (Like, Amen, Love, etc.) |
| **Notifications** | `/api/v1/notifications/` | List notifications, mark as read, subscribe |
| **Admin Content** | `/api/v1/admin/content/` | Create, edit, publish, delete posts (staff+) |
| **Admin Series** | `/api/v1/admin/series/` | Manage sermon series (staff+) |
| **Admin Drafts** | `/api/v1/admin/content/drafts/` | Save/load post drafts (staff+) |
| **Admin Users** | `/api/v1/admin/users/` | List, search, suspend, promote users (admin only) |
| **Admin Moderation** | `/api/v1/admin/interactions/` | Moderate comments, questions, flagged content (staff+) |
| **Payments** | `/api/v1/payments/` | Initialize donation, verify payment, check status |
| **Email Campaigns** | `/api/v1/admin/email/` | Create, send, track campaigns (admin only) |
| **Settings** | `/api/v1/admin/settings/` | Platform config, content types (admin only) |

### WebSocket Endpoint

```
ws://localhost:8000/ws/notifications/    (local dev)
wss://yourdomain.com/ws/notifications/   (production with SSL)
```

WebSocket connects using your existing session. Once connected, you'll receive real-time notification events.

---

## 13. Deployment

### Production with Docker Compose

The simplest way to deploy to a VPS, cloud server, or localhost.

**Prerequisites:**
- Docker & Docker Compose installed
- Domain name (for SSL)
- PostgreSQL or cloud database (optional; included in compose)
- Email SMTP credentials
- Paystack account (for payments)

**Steps:**

```bash
# 1. Clone and navigate to project
git clone <repo-url>
cd church-digital-platform

# 2. Create production environment file
cp .env.example .env.production

# 3. Edit with real values:
#    - SECRET_KEY: long random string
#    - ALLOWED_HOSTS: your actual domain
#    - DATABASE_URL: production database
#    - REDIS_URL: production Redis
#    - PAYSTACK_SECRET_KEY: live keys
#    - etc.
nano .env.production

# 4. Build and start
docker-compose -f docker-compose.yml up -d --build

# 5. Run migrations
docker-compose exec web python backend/manage.py migrate

# 6. Collect static files
docker-compose exec web python backend/manage.py collectstatic --noinput

# 7. Create admin user
docker-compose exec web python backend/manage.py createsuperuser

# 8. Verify health
docker-compose ps
curl http://localhost:8000/api/v1/health/
```

**Access:**
- Website: `http://yourdomain.com` (or `http://localhost:8000` locally)
- Admin: `http://yourdomain.com/admin-auth`
- API Docs: `http://yourdomain.com/api/v1/docs/`

### Production Checklist

Before going live, confirm:

- [ ] `DEBUG=False`
- [ ] Strong, unique `SECRET_KEY` (50+ random characters)
- [ ] `ALLOWED_HOSTS` set to actual domain
- [ ] `CORS_ALLOWED_ORIGINS` set to frontend domain
- [ ] PostgreSQL (not SQLite) in production
- [ ] HTTPS/SSL certificate configured
- [ ] Email SMTP verified and tested
- [ ] Paystack live keys (not test keys)
- [ ] Webhook URL configured in Paystack dashboard
- [ ] Database backups scheduled
- [ ] Error monitoring (e.g., Sentry) configured
- [ ] Firewall rules allow 80, 443, SSH access only
- [ ] Environment variables never committed to git
- [ ] `.env` file added to `.gitignore`

### Scaling (Large Deployments)

For churches with 10,000+ members or high traffic:

1. **Separate database** — Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
2. **Separate Redis** — Use managed Redis instance
3. **Multiple web workers** — Run several Django instances behind load balancer
4. **Dedicated Celery** — Run worker on separate server
5. **CDN** — Put static files and images on CDN (Cloudflare, etc.)
6. **Monitoring** — Add Sentry (error tracking), New Relic (performance)

---

## 14. Design Principles

These principles guide every technical decision in the codebase:

1. **Backend is the single source of truth**
   - All data, permissions, and business logic live in the API
   - Frontend only presents — it never invents or bypasses
   - Role checks are enforced on every API endpoint

2. **Security is built in, not bolted on**
   - JWT tokens with expiration
   - Role-based access control (RBAC) on every endpoint
   - Password hashing with Django's PBKDF2
   - XSS prevention with DOMPurify sanitization
   - CSRF protection on all state-changing requests
   - SQL injection impossible (ORM usage only)
   - Secrets stored as environment variables (never hardcoded)

3. **No mock data, ever**
   - Every feature connects to real data
   - No hardcoded fixtures or demo shortcuts
   - All business logic is testable with real database

4. **Calm, professional design**
   - No flashy animations or decorative noise
   - Accessible design (WCAG 2.1 AA compliance)
   - Semantic HTML with ARIA labels
   - Enterprise-quality UI (comparable to Stripe, Vercel)

5. **Progressive complexity**
   - Simple things are simple
   - Platform works as a content site straight away
   - Power features (campaigns, audit logs) available when needed

6. **Documentation first**
   - Code is self-documenting
   - Architecture is clear and explicit
   - Complex sections have detailed comments

---

## 15. Project Status & Roadmap

### Core Features (✅ Production-Ready)

| Feature | Status | Notes |
|---|---|---|
| **Public content browsing** | ✅ Live | Posts, series, events, search |
| **User registration & login** | ✅ Live | Email verification, password reset |
| **Reactions** | ✅ Live | 5 emoji reactions (Like, Amen, Love, Insight, Praise) |
| **Threaded comments & Q&A** | ✅ Live | Comment moderation, answer resolution |
| **Member profile & preferences** | ✅ Live | Notification settings, profile edit |
| **Admin dashboard** | ✅ Live | Metrics, user stats, content stats |
| **Content management** | ✅ Live | Create, edit, publish, delete, draft, schedule |
| **Sermon series management** | ✅ Live | Organize content in series |
| **Draft auto-save** | ✅ Live | Auto-saves every 30 seconds |
| **User management** | ✅ Live | Roles, suspension, reactivation, export |
| **Comment moderation** | ✅ Live | Review, approve, delete |
| **Custom content types** | ✅ Live | Create new categories |
| **Audit logging** | ✅ Live | Every action tracked |
| **Email campaigns** | ✅ Live | Create, send, track newsletters |
| **Payment processing** | ✅ Live | Paystack integration with fraud detection |
| **Real-time notifications** | ✅ Live | WebSocket + REST API fallback |
| **Docker deployment** | ✅ Live | Full-stack Docker Compose setup |
| **API documentation** | ✅ Live | Auto-generated Swagger/OpenAPI |

### Features in Progress 🔧

| Feature | Status | Expected |
|---|---|---|
| **Email campaign admin UI** | 🔧 Backend complete | Q2 2026 |
| **Reports & analytics UI** | 🔧 Backend complete | Q2 2026 |
| **Moderation reports UI** | 🔧 Backend complete | Q2 2026 |
| **Member sermon library** | 🔧 UI in progress | Q1 2026 |
| **Bible module** | ⏸ Paused | TBD |

### Planned Features 📋

| Feature | Priority | Notes |
|---|---|---|
| **Small groups management** | High | Create, join, manage groups |
| **Prayer wall** | Medium | Prayer requests, community support |
| **Events calendar** | High | RSVP, capacity management |
| **Volunteer management** | Medium | Track availability, shifts |
| **Podcasting** | Low | Audio distribution, RSS feed |
| **Recurring donations** | High | Monthly giving setup |
| **Mobile app** | Low | React Native or native apps |

---

## 16. Security

### Authentication & Authorization

- **JWT tokens** with 60-minute expiration and token rotation
- **Role-based access control** enforced on all endpoints
- **Email verification** required for new accounts
- **Password hashing** with PBKDF2 (default 600,000 iterations)
- **Account suspension** capability (data remains, access denied)

### Data Protection

- **SQL Injection:** Impossible — Django ORM prevents this
- **XSS Protection:** User HTML sanitized with DOMPurify before rendering
- **CSRF Protection:** `CsrfViewMiddleware` on all state-changing requests
- **CORS:** Configured to allow only specified origins (no `*` wildcard)
- **Secrets:** All sensitive values in environment variables (never hardcoded)

### Payment Security

- **Webhook signature verification** — HMAC SHA512 with timing-safe comparison
- **Fraud detection** — Automatic rate-limiting and IP/user-agent tracking
- **Amount validation** — Platform verifies exact amount with Paystack
- **Intent expiry** — Pre-authorized intents expire after 30 minutes
- **Audit logging** — Every payment event recorded for compliance

### Audit Trail

- **Every action logged** — Who did what, when, and to what resource
- **Admin actions** — publish, delete, role change, suspension all logged
- **Never deleted** — Soft deletes preserve data for audit purposes
- **Exportable** — Audit logs can be exported for compliance

### Reporting Security Issues

To report a security vulnerability:
1. **Do NOT** open a public GitHub issue
2. **Contact** the development team privately
3. Include description, steps to reproduce, and potential impact
4. We will investigate and patch promptly

---

## 17. Contributing

We welcome contributions! Please read [instruction.md](instruction.md) first, which covers:

- ✅ Coding standards and naming conventions
- ✅ Branching strategy (feature branches, naming patterns)
- ✅ Commit message format
- ✅ Pull request process
- ✅ Code review criteria
- ✅ Testing requirements
- ✅ When to update documentation

**General guidelines:**
- No TypeScript errors or ESLint warnings in frontend code
- No failing tests in backend code
- All new features require tests and documentation
- No hardcoded values, no mock data in production code

**To contribute:**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write tests for new functionality
5. Ensure all tests pass
6. Commit with clear messages: `git commit -m "Add feature: description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a pull request against `main`
9. Code review and feedback
10. Merge once approved

---

## 18. License

License terms are to be determined. Contact the project maintainers for usage rights and distribution restrictions.

---

<div align="center">

**Built with care for churches and communities.**

Questions? Email the development team or open an issue.

[View on GitHub](https://github.com) · [Report a Bug](https://github.com) · [Request a Feature](https://github.com)

</div>
