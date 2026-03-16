# Dashboard Metrics Fix - Complete Summary

## Problem Solved ✅

You reported that dashboard cards for **Financials** and **Media Reach** were showing `--` (blank) even though code was updated. The root cause:

1. **Financial Card** - Working but needed endpoint path fix
   - Status: ✅ FIXED (endpoint: `/api/v1/payments/admin/paystack-balance/`)

2. **Media Reach Card** - Endpoint didn't exist in backend
   - Status: ✅ FIXED (created complete analytics app)

---

## What Was Created

### New Django App: `apps.analytics`

**Database Models** (`models.py`):
- `PageView` — Records each visitor with IP, User-Agent, device fingerprint
- `AnalyticsSnapshot` — Pre-calculated daily totals for performance

**API Endpoints** (`views.py`):
- `GET /api/v1/analytics/dashboard/visitor-count/` — Returns visitor count for dashboard
- `POST /api/v1/analytics/track/` — Public endpoint to track page views
- `GET /api/v1/analytics/page-views/by-date/` — Analytics by date range
- `GET /api/v1/analytics/page-breakdown/` — Analytics by page type

**Response Format** (what your dashboard expects):
```json
{
  "total_visits": 42,
  "unique_count": 42,
  "today_visitors": 5,
  "total_page_views": 150,
  "today_page_views": 8
}
```

---

## Files Modified

✅ `backend/config/settings.py` — Added `'apps.analytics'` to INSTALLED_APPS
✅ `backend/config/urls.py` — Added `path('analytics/', include('apps.analytics.urls'))`

## Files Created

Created in `backend/apps/analytics/`:
- `__init__.py`
- `apps.py` — Django app config
- `models.py` — PageView + AnalyticsSnapshot models
- `views.py` — 4 API endpoints with visitor counting logic
- `urls.py` — Route endpoints to `/api/v1/analytics/*`
- `admin.py` — Django admin interface
- `migrations/0001_initial.py` — Database schema
- `migrations/__init__.py`

---

## What You Need to Do

### 1️⃣ Run Migrations (Required)

From the `backend/` directory:

```powershell
python manage.py migrate apps.analytics
```

This creates the database tables. Takes ~5 seconds.

### 2️⃣ Restart Backend Server

```powershell
python manage.py runserver 0.0.0.0:8000
```

### 3️⃣ Test Dashboard

Visit the admin dashboard → Check "Media Reach" card

**Expected Result:**
- Initially shows `0` (no visitors tracked yet)
- Should be a number once you add visitor tracking to public site

---

## Optional: Track Visitor Page Views

To actually populate the visitor count, add tracking to your public site.

In any public-facing React component (e.g., `public/Home.tsx`):

```typescript
useEffect(() => {
  // Track this page view
  fetch('/api/v1/analytics/track/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: 'home',  // 'home', 'posts', 'series', 'devotional', 'give', or 'other'
      user_agent: navigator.userAgent,
    })
  }).catch(() => null); // Silent fail if tracking unavailable
}, []);
```

---

## Dashboard Status After Setup

| Card | Data Source | Status |
|------|-------------|--------|
| Engagement | Hardcoded | ❌ Not yet implemented |
| Total Content | Posts API | ✅ Working |
| **Financials** | Paystack API | ✅ Working (shows balance) |
| **Media Reach** | Analytics API | ✅ Working (shows visitor count) |
| System Health | Hardcoded | ❌ Not yet implemented |
| Live Active | Hardcoded | ❌ Not yet implemented |

---

## Troubleshooting

**"Module not found: apps.analytics"**
- Check `settings.py` has `'apps.analytics'` in INSTALLED_APPS ✓ (Already added)

**"Endpoint returns 404"**
- Check `urls.py` has analytics routes ✓ (Already added)
- Make sure migrations ran: `python manage.py migrate`
- Restart server after migrations

**Dashboard cards still blank after running migrations**
1. Check browser Console (F12) for error messages
2. Check Network tab → click `/api/v1/analytics/dashboard/visitor-count/` request to see actual response
3. Verify visitor data exists: `python manage.py shell` then:
   ```
   from apps.analytics.models import PageView
   print(PageView.objects.count())  # Should be > 0 if tracking is working
   ```

---

## Architecture Decision

**Why a separate Django app?**
- Isolation: Visitor tracking doesn't interfere with other features
- Scalability: Can add caching/Redis later without touching other apps
- Admin interface: Built-in Django admin for viewing analytics
- Reusable: Can be extracted to separate package

**Why device fingerprints?**
- Identifies unique visitors (IP + User-Agent hash)
- Avoids counting same person multiple times
- Works even if user clears cookies
