# Analytics System Setup & Migration Guide

## What Was Just Created

A new Django app `apps.analytics` with visitor tracking infrastructure:

- **Models**: `PageView` (track individual visits) + `AnalyticsSnapshot` (daily aggregates)
- **API Endpoints**: 
  - `GET /api/v1/analytics/dashboard/visitor-count/` — **Dashboard metric endpoint** 
  - `GET /api/v1/analytics/page-views/by-date/` — Grouped by date
  - `GET /api/v1/analytics/page-breakdown/` — Grouped by page type
  - `POST /api/v1/analytics/track/` — Public tracking endpoint

- **Integration**: Already wired into Django settings and URL config

## Step 1: Run Migrations

From the `backend/` directory, run:

```powershell
python manage.py migrate apps.analytics
```

Or to run all pending migrations:

```powershell
python manage.py migrate
```

This creates two database tables:
- `analytics_pageview` — Records each visitor with IP, User-Agent, device fingerprint
- `analytics_snapshot` — Pre-calculated daily visitor totals

## Step 2: Verify the Endpoint Works

After migration, test in browser or curl:

```
GET http://localhost:8000/api/v1/analytics/dashboard/visitor-count/
```

Should return (initially empty):
```json
{
  "total_visits": 0,
  "unique_count": 0,
  "today_visitors": 0,
  "total_page_views": 0,
  "today_page_views": 0
}
```

## Step 3: Optional - Track Page Views from Frontend

To actually populate visitor data, you can add this to your React public site components:

```typescript
// Call this when the public site page loads
const trackPageView = async () => {
  try {
    await fetch('/api/v1/analytics/track/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: 'home',  // or 'posts', 'series', 'devotional', 'give'
        user_agent: navigator.userAgent,
        session_id: sessionStorage.getItem('sessionId'),
      })
    });
  } catch (err) {
    console.log('Analytics tracking skipped:', err);
  }
};

// Call on component mount
useEffect(() => { trackPageView(); }, []);
```

## Dashboard Integration Status

✅ **Frontend Ready**: `src/admin/Dashboard/DashboardOverview.tsx` 
- Already fetches from `/api/v1/analytics/dashboard/visitor-count/`
- Expected response key: `total_visits`
- Displays value in "Media Reach" metric card

✅ **Financial Card Ready**: `/api/v1/payments/admin/paystack-balance/`
- Fetches Paystack balance, converts from kobo to NGN
- Displays in "Financials" metric card

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Analytics App | ✅ Created | Location: `backend/apps/analytics/` |
| Django Integration | ✅ Configured | Registered in INSTALLED_APPS and URL config |
| Database Schema | ⏳ Pending | Need to run `migrate` command |
| Dashboard Financial | ✅ Working | Calls `/payments/admin/paystack-balance/` |
| Dashboard Media Reach | ✅ Ready | Calls `/analytics/dashboard/visitor-count/` (after migrate) |

## Troubleshooting

**Error: "No module named 'apps.analytics'"**
- Ensure `apps.analytics` was added to INSTALLED_APPS in `settings.py`
- Check: Search for "apps.analytics" in `backend/config/settings.py`

**Endpoint returns 404**
- Run migrations: `python manage.py migrate`
- Restart Django server

**Dashboard cards still show "--"**
1. Check browser console (F12 → Console) for error messages
2. Check Network tab → look for `/api/v1/analytics/dashboard/visitor-count/` response
3. Verify user has proper authentication/permissions (public endpoint, no auth required)
4. Check if page views exist: `python manage.py shell` then `from apps.analytics.models import PageView; print(PageView.objects.count())`

## Next: Restart Backend

Once migrations finish, restart your Django development server:

```powershell
python manage.py runserver 0.0.0.0:8000
```

Then your dashboard should display:
- **Financials**: Current Paystack balance (e.g., "₦50,000.00")
- **Media Reach**: Total unique visitors (e.g., "42" after some page views tracked)
