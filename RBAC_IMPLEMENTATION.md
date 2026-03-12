# Role-Based Access Control (RBAC) Implementation

## ✅ PRODUCTION-READY RBAC SYSTEM

This document describes the complete RBAC implementation for the Church Digital Engagement Platform.

---

## 📋 ROLE DEFINITIONS

| Role | Description | User Count |
|------|-------------|------------|
| **ADMIN** | Full system control - can manage users, content, and all platform features | System-level (typically 1-2) |
| **MODERATOR** | Content & community control - can manage content, moderate interactions, but CANNOT manage users | Limited (trusted volunteers) |
| **MEMBER** | Regular user - can view content, comment, and react (unless suspended) | Unlimited |

---

## 🔐 ACCESS MATRIX (AUTHORITATIVE)

### ADMIN (Full Access)

✅ **User Management** (ADMIN ONLY)
- View all MEMBER and MODERATOR accounts
- Change user roles (MEMBER ↔ MODERATOR)
- Suspend/reactivate user accounts
- Export user data

✅ **Content Management**
- Create/Edit/Publish/Schedule posts
- Unpublish/Delete posts
- Feature content

✅ **Moderation**
- Moderate comments & reactions
- Review and resolve reports
- View audit logs

✅ **Communications**
- Create and send email campaigns
- Manage email subscriptions

✅ **Dashboard Access**
- Full admin dashboard
- All menu items visible
- Complete system analytics

---

### MODERATOR (Limited Admin Access)

✅ **Admin Dashboard Access**
- Can access `/admin` routes
- Can see admin navigation
- Badge shows "MODERATOR" role

✅ **Content Management**
- Create posts
- Edit posts (including scheduled)
- Publish & unpublish posts
- Delete posts
- Feature content

✅ **Moderation**
- Moderate comments (delete, restore)
- Moderate reactions
- Answer questions
- Close/reopen discussions
- Review reports

✅ **Email Campaigns**
- Create email campaigns
- Send campaigns to members
- View campaign statistics

✅ **Audit Logs**
- View system audit logs
- Track moderation actions

❌ **User Management (BLOCKED)**
- **CANNOT** access User Management menu (hidden in UI)
- **CANNOT** call User Management APIs (403 Forbidden at backend)
- **CANNOT** promote/demote users
- **CANNOT** suspend/reactivate users
- **CANNOT** change roles
- **CANNOT** export user data

🔒 **Double Enforcement:**
1. **Frontend**: User Management menu hidden for MODERATOR
2. **Backend**: `/api/v1/admin/users/*` returns 403 Forbidden for MODERATOR

---

### MEMBER (Regular User)

✅ **Public Content**
- View published content
- Comment on posts (if enabled)
- React to posts
- Ask questions

❌ **Restricted**
- Cannot access admin pages (redirected to `/member`)
- Cannot create content
- Cannot moderate
- Cannot access user management

**When Suspended:**
- Can still view content
- **Cannot** comment
- **Cannot** react
- **Cannot** ask questions

---

## 🏗️ BACKEND IMPLEMENTATION

### Permission Classes

Location: `backend/apps/users/permissions.py`

```python
class IsAdmin(permissions.BasePermission):
    """
    ADMIN ONLY - Used exclusively for User Management endpoints.
    MODERATOR is explicitly blocked.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )


class IsModerator(permissions.BasePermission):
    """
    ADMIN + MODERATOR - Used for content management, moderation,
    email campaigns, audit logs, and reports.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.ADMIN, UserRole.MODERATOR]
        )
```

---

### API Endpoint Permissions

| Endpoint | Permission | Accessible By |
|----------|-----------|---------------|
| `/api/v1/admin/users/*` | `IsAdmin` | ADMIN only |
| `/api/v1/admin/posts/*` | `IsModerator` | ADMIN, MODERATOR |
| `/api/v1/admin/comments/*` | `IsModerator` | ADMIN, MODERATOR |
| `/api/v1/admin/questions/*` | `IsModerator` | ADMIN, MODERATOR |
| `/api/v1/admin/reports/*` | `IsModerator` | ADMIN, MODERATOR |
| `/api/v1/admin/audit-logs/*` | `IsModerator` | ADMIN, MODERATOR |
| `/api/v1/admin/email-campaigns/*` | `IsModerator` | ADMIN, MODERATOR |

---

### ViewSet Configuration

**User Management (ADMIN ONLY)**
```python
# backend/apps/users/views.py
class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        # Exclude ADMIN users - system-level accounts
        return User.objects.filter(
            is_active=True
        ).exclude(
            role=UserRole.ADMIN
        )
```

**Content Management (ADMIN + MODERATOR)**
```python
# backend/apps/content/views.py
class AdminPostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsModerator]
```

**Moderation (ADMIN + MODERATOR)**
```python
# backend/apps/interactions/comment_views.py
class AdminCommentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsModerator]

# backend/apps/moderation/views.py
class AdminReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsModerator]

class AdminAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsModerator]
```

**Email Campaigns (ADMIN + MODERATOR)**
```python
# backend/apps/email_campaigns/views.py
class AdminEmailCampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsModerator]
```

---

## 🎨 FRONTEND IMPLEMENTATION

### Route Protection

Location: `src/router/ProtectedRoute.tsx`

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[]; // Support array of roles
}

// Admin routes accept both ADMIN and MODERATOR
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.MODERATOR]}>
      <AdminDashboard />
    </ProtectedRoute>
  } 
/>
```

---

### Navigation Visibility

**Header Navigation** (`src/components/Header.tsx`)

```typescript
// Show Admin Panel link for ADMIN and MODERATOR
{(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
  <Link to="/admin" className="nav-link admin-link">Admin Panel</Link>
)}
```

**Admin Dashboard Sidebar** (`src/admin/AdminDashboard.tsx`)

```typescript
// Hide User Management menu for MODERATOR
{user?.role === 'ADMIN' && (
  <button
    className={`nav-item ${activeView === 'users' ? 'active' : ''}`}
    onClick={() => setActiveView('users')}
  >
    <span className="nav-icon">👥</span>
    Users
  </button>
)}
```

**Dashboard Overview Cards**

```typescript
// Hide User Management card for MODERATOR
{user?.role === 'ADMIN' && (
  <div className="dashboard-card" onClick={() => setActiveView('users')}>
    <div className="card-icon">👥</div>
    <h3>User Management</h3>
    <p>Manage member accounts, roles, and permissions</p>
    <button className="btn-card">Manage Users</button>
  </div>
)}
```

**Dynamic Role Badge**

```typescript
<div className="sidebar-header">
  <h1>Admin Portal</h1>
  <span className="admin-badge">{user?.role || 'ADMIN'}</span>
</div>
```

---

## 🔒 SECURITY PRINCIPLES

### Double Enforcement

Every restricted feature is protected at **TWO LEVELS**:

1. **Frontend (UX)**: Hide UI elements user shouldn't access
2. **Backend (Security)**: Reject unauthorized API calls with 403 Forbidden

**Example: User Management**
- Frontend: Menu item hidden for MODERATOR
- Backend: `IsAdmin` permission class returns 403 for MODERATOR requests

### Defense in Depth

Even if a MODERATOR:
- Manually navigates to `/admin?view=users`
- Directly calls `GET /api/v1/admin/users/`
- Uses browser dev tools to unhide UI

**Result:** Backend returns `403 Forbidden` - security is enforced at API level.

---

## 🧪 TESTING RBAC

### Test Scenarios

**1. ADMIN User**
- ✅ Can access all admin dashboard sections
- ✅ Can see "Users" menu item
- ✅ Can view User Management page
- ✅ Can call `/api/v1/admin/users/` successfully
- ✅ Can suspend/reactivate users
- ✅ Can change user roles

**2. MODERATOR User**
- ✅ Can access admin dashboard
- ✅ Can see Content, Moderation, Email, Reports menus
- ❌ Cannot see "Users" menu item (hidden)
- ❌ Cannot call `/api/v1/admin/users/` (403 Forbidden)
- ✅ Can create and publish posts
- ✅ Can moderate comments and reactions
- ✅ Can send email campaigns

**3. MEMBER User**
- ❌ Cannot access `/admin` routes (redirected to `/member`)
- ❌ Cannot call any `/api/v1/admin/*` endpoints (403 Forbidden)
- ✅ Can view public content
- ✅ Can comment and react (unless suspended)

**4. Suspended MEMBER**
- ✅ Can view content
- ❌ Cannot create comments (403 Forbidden)
- ❌ Cannot create reactions (403 Forbidden)

---

## 📝 AUDIT LOGGING

All admin actions are logged with:
- **Who**: Admin/Moderator performing action
- **What**: Target user/content being modified
- **Details**: Old value → New value
- **When**: Timestamp (auto-generated)
- **Where**: IP address (if available)

**Example: Role Change by ADMIN**
```python
AuditLog.objects.create(
    user=request.user,  # ADMIN performing action
    action_type='ROLE_CHANGE',
    content_object=target_user,  # MEMBER being promoted
    description=f'Changed user@example.com role from MEMBER to MODERATOR'
)
```

**Example: Content Deletion by MODERATOR**
```python
AuditLog.objects.create(
    user=request.user,  # MODERATOR performing action
    action_type='DELETE',
    content_object=post,
    description=f'Deleted post: {post.title}'
)
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before going to production:

**Backend**
- ✅ All viewsets have correct permission classes
- ✅ IsAdmin used ONLY for User Management
- ✅ IsModerator used for all other admin endpoints
- ✅ Admin users excluded from user management queries
- ✅ Audit logging enabled for all admin actions

**Frontend**
- ✅ Admin routes accept [ADMIN, MODERATOR]
- ✅ User Management menu hidden for MODERATOR
- ✅ User Management card hidden for MODERATOR
- ✅ Role badge shows correct role dynamically
- ✅ Navigation reflects current user's permissions

**Testing**
- ✅ Test with ADMIN account (full access)
- ✅ Test with MODERATOR account (limited access)
- ✅ Test with MEMBER account (no admin access)
- ✅ Verify 403 errors for unauthorized API calls
- ✅ Verify audit logs created correctly

---

## 🎯 FUTURE ENHANCEMENTS

Potential improvements:
- [ ] Add SUPER_ADMIN role for multi-tenant support
- [ ] Fine-grained permissions (e.g., can_delete_posts, can_suspend_users)
- [ ] Permission groups/templates
- [ ] IP-based access restrictions
- [ ] Two-factor authentication for ADMIN/MODERATOR
- [ ] Session timeout for admin users
- [ ] Audit log viewer UI with filtering
- [ ] Real-time notifications for admin actions

---

## 📚 REFERENCES

- Django REST Framework Permissions: https://www.django-rest-framework.org/api-guide/permissions/
- React Router Protected Routes: https://reactrouter.com/en/main/start/tutorial
- OWASP Access Control: https://owasp.org/www-community/Access_Control

---

**Last Updated:** January 22, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
