"""
Module permission codes for granular moderator access control.

Each code maps to one admin module. Permissions are stored as a JSON list
on ModeratorPermission and cached in Redis for zero-DB-hit checks.

Usage:
    from apps.users.permission_codes import PERMISSION_CODES, ALL_CODES

    # Check if a code is valid
    if code in ALL_CODES: ...

    # Get human label for a code
    label = PERMISSION_CODES[code]['label']
"""

PERMISSION_CODES: dict[str, dict] = {
    # ── Finance ──────────────────────────────────────────────────────────
    # Note: Financial Hub dashboard auto-shows when ANY Finance permission is granted
    "fin.payments": {
        "label": "Payment Records",
        "description": "Transaction history, Paystack webhook data",
        "category": "Finance",
        "icon": "payments",
    },
    "fin.reports": {
        "label": "Financial Reports",
        "description": "Generate and download financial reports",
        "category": "Finance",
        "icon": "bar_chart",
    },
    "fin.seed": {
        "label": "Seed Manager",
        "description": "Giving categories, seed/offering catalog",
        "category": "Finance",
        "icon": "volunteer_activism",
    },

    # ── Content ───────────────────────────────────────────────────────────
    "content.posts": {
        "label": "Posts & Sermons",
        "description": "Create, edit, publish and delete posts",
        "category": "Content",
        "icon": "movie",
    },
    "content.series": {
        "label": "Series",
        "description": "Manage sermon series and episodes",
        "category": "Content",
        "icon": "library_books",
    },
    "content.drafts": {
        "label": "Post Drafts",
        "description": "Review and manage saved drafts",
        "category": "Content",
        "icon": "edit_note",
    },
    "content.daily_word": {
        "label": "Daily Words",
        "description": "Devotional calendar and daily word entries",
        "category": "Content",
        "icon": "calendar_today",
    },

    # ── Scheduling ────────────────────────────────────────────────────────
    "schedule.weekly_flow": {
        "label": "Weekly Flow",
        "description": "Plan and schedule weekly ministry content",
        "category": "Scheduling",
        "icon": "schedule",
    },
    "schedule.events": {
        "label": "Events Calendar",
        "description": "Create and manage church events",
        "category": "Scheduling",
        "icon": "event",
    },
    "schedule.podcasting": {
        "label": "Podcasting",
        "description": "Podcast episode and channel management",
        "category": "Scheduling",
        "icon": "podcasts",
    },

    # ── Community ─────────────────────────────────────────────────────────
    "community.moderation": {
        "label": "Moderation",
        "description": "Review reports, moderate comments and content",
        "category": "Community",
        "icon": "forum",
    },
    "community.groups": {
        "label": "Small Groups",
        "description": "Manage small groups and cell communities",
        "category": "Community",
        "icon": "groups_2",
    },
    "community.prayer": {
        "label": "Prayer Wall",
        "description": "Moderate and respond to prayer requests",
        "category": "Community",
        "icon": "volunteer_activism",
    },
    "community.volunteers": {
        "label": "Volunteers",
        "description": "Volunteer roster and scheduling",
        "category": "Community",
        "icon": "manage_accounts",
    },

    # ── Outreach ──────────────────────────────────────────────────────────
    "outreach.email": {
        "label": "Email Campaigns",
        "description": "Build, schedule and send email campaigns",
        "category": "Outreach",
        "icon": "campaign",
    },
    "analytics.reports": {
        "label": "Analytics Reports",
        "description": "View platform analytics and engagement reports (read-only)",
        "category": "Outreach",
        "icon": "bar_chart",
    },
}

# Flat set of all valid codes for O(1) membership tests
ALL_CODES: frozenset[str] = frozenset(PERMISSION_CODES.keys())

# ── Pre-defined sub-role templates ─────────────────────────────────────────
# These are convenience presets shown in the AdminSettings → RolesTab UI.
# Applying a template simply writes the listed codes to ModeratorPermission.

SUB_ROLE_TEMPLATES: dict[str, dict] = {
    "finance": {
        "label": "Finance Moderator",
        "description": "Access to all financial modules only",
        "color": "#10b981",
        "icon": "account_balance",
        "codes": ["fin.payments", "fin.reports", "fin.seed"],
    },
    "content": {
        "label": "Content Moderator",
        "description": "Post creation, series, drafts and daily words",
        "color": "#3b82f6",
        "icon": "edit",
        "codes": [
            "content.posts", "content.series",
            "content.drafts", "content.daily_word",
        ],
    },
    "scheduling": {
        "label": "Scheduling Moderator",
        "description": "Weekly flow, events and podcasting",
        "color": "#8b5cf6",
        "icon": "schedule",
        "codes": [
            "schedule.weekly_flow", "schedule.events", "schedule.podcasting",
        ],
    },
    "community": {
        "label": "Community Moderator",
        "description": "Moderation, small groups, prayer wall and volunteers",
        "color": "#f59e0b",
        "icon": "groups",
        "codes": [
            "community.moderation", "community.groups",
            "community.prayer", "community.volunteers",
        ],
    },
    "outreach": {
        "label": "Outreach Moderator",
        "description": "Email campaigns and read-only analytics",
        "color": "#ec4899",
        "icon": "campaign",
        "codes": ["outreach.email", "analytics.reports"],
    },
    "full": {
        "label": "Full Moderator",
        "description": "All module permissions — original moderator scope",
        "color": "#64748b",
        "icon": "admin_panel_settings",
        "codes": list(ALL_CODES),
    },
}
