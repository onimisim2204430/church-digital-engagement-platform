# Tenancy and User System Architecture Report
**Church Digital Engagement Platform**

*Prepared for: Lead Engineer Handover*  
*Date: March 7, 2026*  
*Prepared by: System Analysis Team*

---

## Executive Summary

This document provides a comprehensive analysis of the **tenancy architecture** and **user management system** for the Church Digital Engagement Platform. This is a **single-tenant application** designed to serve ONE church organization with a sophisticated role-based access control (RBAC) system.

**Key Findings:**
- **Tenancy Model:** Single-tenant (one church instance per deployment)
- **User Roles:** 4 hierarchical roles (VISITOR, MEMBER, MODERATOR, ADMIN)
- **Authentication:** JWT-based with custom User model
- **Authorization:** Multi-layer RBAC enforced at API and UI levels
- **User Model:** UUID-based with comprehensive profile and suspension management

---

## Table of Contents

1. [Tenancy Architecture](#1-tenancy-architecture)
2. [User Roles & Hierarchy](#2-user-roles--hierarchy)
3. [User Model Structure](#3-user-model-structure)
4. [Permission System](#4-permission-system)
5. [Access Control Matrix](#5-access-control-matrix)
6. [Authentication Flow](#6-authentication-flow)
7. [Frontend Role Enforcement](#7-frontend-role-enforcement)
8. [Backend API Protection](#8-backend-api-protection)
9. [User Management Capabilities](#9-user-management-capabilities)
10. [Suspension & Account Status System](#10-suspension--account-status-system)
11. [Email Verification System](#11-email-verification-system)
12. [Audit & Compliance](#12-audit--compliance)
13. [Database Schema](#13-database-schema)
14. [Security Considerations](#14-security-considerations)
15. [Migration Path to Multi-Tenancy](#15-migration-path-to-multi-tenancy)

---

## 1. Tenancy Architecture

### Current Implementation: **Single-Tenant**

The platform is designed as a **single-tenant application**, meaning:

- **One deployment = One church organization**
- No organization/church model exists in the database
- All users belong to the same church instance
- No tenant isolation required in database queries
- All content is shared within the single church community

### Architecture Characteristics

```
┌─────────────────────────────────────────────┐
│   Church Digital Engagement Platform       │
│   (Single Church Instance)                  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Admin   │  │Moderator │  │  Member  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│       │              │              │      │
│       └──────────────┼──────────────┘      │
│                      │                     │
│              ┌───────▼────────┐            │
│              │  Shared Content │            │
│              │  & Resources    │            │
│              └─────────────────┘            │
│                                             │
└─────────────────────────────────────────────┘
```

### Database Configuration

- **Single Database:** All data in one PostgreSQL database
- **No Tenant Field:** Models do NOT have a `tenant_id` or `organization_id` field
- **Deployment Model:** Each church deploys their own instance
- **Data Isolation:** Achieved through separate deployments, not multi-tenancy

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Django 5 + Django REST Framework |
| **Database** | PostgreSQL (production) / SQLite (development) |
| **Authentication** | JWT (SimpleJWT) with token blacklisting |
| **Frontend** | React 18 + TypeScript |
| **User Model** | Custom User extending AbstractBaseUser |

---

## 2. User Roles & Hierarchy

The platform implements a **4-tier hierarchical role system**:

### Role Hierarchy (Ascending Order)

```
VISITOR (Lowest)
   ↓
MEMBER
   ↓
MODERATOR
   ↓
ADMIN (Highest)
```

### Role Definitions

#### 1. VISITOR

**Description:** Anonymous or unregistered users browsing the public website

**Capabilities:**
- Browse public content (sermons, articles, announcements)
- View sermon series
- Read public comments
- Register for a member account
- View events and ministry information

**Limitations:**
- Cannot react to content
- Cannot comment or participate in discussions
- Cannot access member-only content
- No dashboard access

**Database Representation:**  
Default role assigned during registration: `role = 'VISITOR'`

---

#### 2. MEMBER

**Description:** Registered and authenticated community members

**Capabilities:**
- All VISITOR capabilities
- React to posts (Like, Amen, Love, Insight, Praise)
- Comment on posts and participate in discussions
- Ask questions to church staff
- Access member dashboard at `/member`
- Manage profile and preferences
- Control email subscription settings
- View member-only content
- Make giving/donations (if feature enabled)

**Limitations:**
- Cannot create or manage content
- Cannot access admin dashboard
- Cannot moderate or manage other users
- Cannot send email campaigns

**Promotion Path:**  
MEMBER → MODERATOR (by ADMIN only)

**Database Representation:**  
`role = 'MEMBER'`

---

#### 3. MODERATOR

**Description:** Trusted volunteers managing content and community interactions

**Capabilities:**
- All MEMBER capabilities
- **Content Management:**
  - Create, edit, publish posts
  - Schedule content publication
  - Feature content on homepage
  - Manage sermon series
  - Unpublish and soft-delete posts
- **Community Moderation:**
  - Delete and restore comments
  - Answer questions from members
  - Close/reopen discussions
  - Review flagged content reports
- **Email Campaigns:**
  - Create and send email campaigns
  - View campaign statistics
- **Admin Dashboard Access:**
  - Access `/admin` routes
  - View content analytics
  - See audit logs (limited)

**Critical Limitations:**
- **CANNOT access User Management** (hidden in UI, blocked in API)
- **CANNOT promote/demote users**
- **CANNOT suspend or reactivate accounts**
- **CANNOT change user roles**
- **CANNOT access financial/payment records**
- **CANNOT modify platform settings**

**Promotion Path:**  
MODERATOR → ADMIN (manual database update or superuser creation)

**Security Model:**  
Double enforcement:
1. Frontend: User Management menu hidden
2. Backend: `/api/v1/admin/users/*` returns 403 Forbidden

**Database Representation:**  
`role = 'MODERATOR'`

---

#### 4. ADMIN

**Description:** System administrators with full platform control

**Capabilities:**
- All MODERATOR capabilities
- **User Management (EXCLUSIVE):**
  - View all MEMBER and MODERATOR accounts
  - Promote MEMBER to MODERATOR
  - Demote MODERATOR to MEMBER
  - Suspend and reactivate accounts
  - Export user data
  - Manage email subscriptions for users
- **Financial & Payments:**
  - View all payment transactions
  - Access financial hub
  - Generate financial reports
- **Platform Settings:**
  - Configure application settings
  - Manage content types
  - Control platform features
- **Full Audit Access:**
  - View complete audit trail
  - Track all administrative actions

**Protection:**  
ADMIN users are EXCLUDED from the user management interface to prevent accidental self-demotion or suspension.

**Creation:**  
Created via Django management command:
```bash
python manage.py createsuperuser
```

**Database Representation:**  
`role = 'ADMIN'`, `is_staff = True`, `is_superuser = True`

---

## 3. User Model Structure

The platform uses a **custom User model** extending Django's `AbstractBaseUser` and `PermissionsMixin`.

### Database Table: `users`

**File:** `backend/apps/users/models.py`

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key (UUID4) |
| `email` | EmailField | Unique, used for authentication |
| `first_name` | CharField(150) | User's first name |
| `last_name` | CharField(150) | User's last name |
| `role` | CharField(10) | VISITOR, MEMBER, MODERATOR, ADMIN |
| `is_active` | BooleanField | Account active status |
| `is_staff` | BooleanField | Django admin site access |
| `is_superuser` | BooleanField | Django superuser flag |
| `date_joined` | DateTimeField | Account creation timestamp |
| `last_login` | DateTimeField | Last login timestamp |

### Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| `phone_number` | CharField(20) | Optional contact number |
| `profile_picture` | ImageField | Profile image (upload_to='profile_pictures/') |
| `bio` | TextField | User biography |

### Email Management

| Field | Type | Description |
|-------|------|-------------|
| `email_subscribed` | BooleanField | Newsletter subscription status |
| `email_verified` | BooleanField | Email verification status |
| `email_verified_at` | DateTimeField | Verification timestamp |
| `email_verification_token` | CharField(255) | Hashed verification token |
| `email_verification_token_expires_at` | DateTimeField | Token expiration |
| `email_verification_sent_at` | DateTimeField | Last verification email sent |

### Suspension Management

| Field | Type | Description |
|-------|------|-------------|
| `is_suspended` | BooleanField | Suspension status |
| `suspended_at` | DateTimeField | Suspension timestamp |
| `suspended_by` | ForeignKey(User) | Admin who suspended account |
| `suspension_reason` | TextField | Reason for suspension |
| `suspension_expires_at` | DateTimeField | Auto-unsuspend timestamp |

### Authentication Configuration

```python
USERNAME_FIELD = 'email'
REQUIRED_FIELDS = ['first_name', 'last_name']
```

### Model Manager

**Custom UserManager:**
- `create_user()` - Create regular user
- `create_superuser()` - Create ADMIN with all permissions

### Model Methods

```python
# Role checking properties
@property
def is_visitor(self) -> bool
    
@property
def is_member(self) -> bool
    
@property
def is_admin(self) -> bool
    
@property
def account_status(self) -> str  # 'active', 'suspended', 'disabled'

# Account management
def suspend(self, suspended_by, reason, expires_at=None)
def unsuspend(self)
```

### Database Indexes

```python
indexes = [
    models.Index(fields=['email']),
    models.Index(fields=['role']),
    models.Index(fields=['is_active']),
]
```

---

## 4. Permission System

The platform implements **custom DRF permission classes** for granular access control.

### Permission Classes

**File:** `backend/apps/users/permissions.py`

#### 1. IsAdmin

```python
class IsAdmin(permissions.BasePermission):
    """Only ADMIN users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )
```

**Used For:**
- User Management endpoints (`/api/v1/admin/users/`)
- Financial hub and payment records
- Platform settings management

---

#### 2. IsModerator

```python
class IsModerator(permissions.BasePermission):
    """ADMIN and MODERATOR users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.ADMIN, UserRole.MODERATOR]
        )
```

**Used For:**
- Admin dashboard (`/admin`)
- Content management endpoints
- Moderation tools
- Email campaign management
- Sermon series management

---

#### 3. IsMember

```python
class IsMember(permissions.BasePermission):
    """MEMBER and ADMIN users can access"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.MEMBER, UserRole.ADMIN]
        )
```

**Used For:**
- Member-only content access
- Premium features (if implemented)

---

#### 4. IsOwnerOrAdmin

```python
class IsOwnerOrAdmin(permissions.BasePermission):
    """Resource owner or ADMIN can access"""
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == UserRole.ADMIN:
            return True
        
        # Check ownership
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        return False
```

**Used For:**
- User profile updates
- User-owned comments and reactions
- Personal data access

---

## 5. Access Control Matrix

### Feature Access by Role

| Feature/Endpoint | VISITOR | MEMBER | MODERATOR | ADMIN |
|-----------------|---------|--------|-----------|-------|
| **Public Content** |
| Browse posts | ✅ | ✅ | ✅ | ✅ |
| View sermon details | ✅ | ✅ | ✅ | ✅ |
| View public comments | ✅ | ✅ | ✅ | ✅ |
| View events | ✅ | ✅ | ✅ | ✅ |
| **Authentication** |
| Register account | ✅ | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ | ✅ |
| Logout | N/A | ✅ | ✅ | ✅ |
| **Member Features** |
| React to posts | ❌ | ✅ | ✅ | ✅ |
| Comment on posts | ❌ | ✅ | ✅ | ✅ |
| Ask questions | ❌ | ✅ | ✅ | ✅ |
| Access member dashboard | ❌ | ✅ | ✅ | ✅ |
| Update own profile | ❌ | ✅ | ✅ | ✅ |
| **Content Management** |
| Create posts | ❌ | ❌ | ✅ | ✅ |
| Edit posts | ❌ | ❌ | ✅ | ✅ |
| Publish posts | ❌ | ❌ | ✅ | ✅ |
| Schedule posts | ❌ | ❌ | ✅ | ✅ |
| Delete posts (soft) | ❌ | ❌ | ✅ | ✅ |
| Feature content | ❌ | ❌ | ✅ | ✅ |
| Manage series | ❌ | ❌ | ✅ | ✅ |
| Manage content types | ❌ | ❌ | ❌ | ✅ |
| **Moderation** |
| Delete comments | ❌ | ❌ | ✅ | ✅ |
| Restore comments | ❌ | ❌ | ✅ | ✅ |
| Answer questions | ❌ | ❌ | ✅ | ✅ |
| View reports | ❌ | ❌ | ✅ | ✅ |
| Moderate reactions | ❌ | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ❌ | ✅ (limited) | ✅ (full) |
| **User Management** |
| View user list | ❌ | ❌ | ❌ | ✅ |
| View user details | ❌ | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ❌ | ✅ |
| Suspend users | ❌ | ❌ | ❌ | ✅ |
| Reactivate users | ❌ | ❌ | ❌ | ✅ |
| Export user data | ❌ | ❌ | ❌ | ✅ |
| **Email Campaigns** |
| Create campaigns | ❌ | ❌ | ✅ | ✅ |
| Send campaigns | ❌ | ❌ | ✅ | ✅ |
| View campaign stats | ❌ | ❌ | ✅ | ✅ |
| **Financial** |
| View payment records | ❌ | ❌ | ❌ | ✅ |
| Access financial hub | ❌ | ❌ | ❌ | ✅ |
| Generate reports | ❌ | ❌ | ❌ | ✅ |
| **Settings** |
| Platform settings | ❌ | ❌ | ❌ | ✅ |
| Admin settings | ❌ | ❌ | ❌ | ✅ |

---

## 6. Authentication Flow

### JWT-Based Authentication

The platform uses **JSON Web Tokens (JWT)** for stateless authentication.

**Library:** `djangorestframework-simplejwt`

### Token Types

| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| **Access Token** | 60 minutes | API authentication |
| **Refresh Token** | 7 days | Obtain new access tokens |

### Registration Flow

```
User → POST /api/v1/auth/register/
    ↓
  {
    email,
    password,
    password_confirm,
    first_name,
    last_name
  }
    ↓
Backend:
  - Validate data
  - Create User (role=VISITOR by default)
  - Hash password
  - Send verification email
    ↓
Response:
  {
    user: {...},
    access: "<jwt_token>",
    refresh: "<refresh_token>"
  }
```

### Login Flow

```
User → POST /api/v1/auth/login/
    ↓
  {
    email,
    password
  }
    ↓
Backend:
  - Authenticate user
  - Check is_active & is_suspended
  - Generate JWT tokens
    ↓
Response:
  {
    user: {...},
    access: "<jwt_token>",
    refresh: "<refresh_token>"
  }
```

### Logout Flow

```
User → POST /api/v1/auth/logout/
    ↓
  {
    refresh: "<refresh_token>"
  }
    ↓
Backend:
  - Blacklist refresh token
  - Prevent token reuse
    ↓
Response: 205 Reset Content
```

### Token Refresh Flow

```
Client → POST /api/token/refresh/
    ↓
  {
    refresh: "<refresh_token>"
  }
    ↓
Backend:
  - Verify refresh token
  - Check blacklist
  - Generate new access token
    ↓
Response:
  {
    access: "<new_jwt_token>"
  }
```

### Authentication Headers

```http
Authorization: Bearer <access_token>
```

---

## 7. Frontend Role Enforcement

### React Router Protection

**File:** `src/router/ProtectedRoute.tsx`

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role authorization
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) 
      ? requiredRole 
      : [requiredRole];
    
    if (user?.role && !allowedRoles.includes(user.role)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
};
```

### Route Configuration Examples

**File:** `src/router/AppRouter.tsx`

```tsx
// Member Routes (authenticated users)
<Route 
  path="/member" 
  element={
    <ProtectedRoute>
      <MemberLayout />
    </ProtectedRoute>
  }
/>

// Admin Routes (ADMIN and MODERATOR only)
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.MODERATOR]}>
      <AdminLayout />
    </ProtectedRoute>
  }
/>

// User Management (ADMIN only)
<Route 
  path="users" 
  element={
    <AdminOnlyRoute>
      <UserManager />
    </AdminOnlyRoute>
  }
/>
```

### Admin Sidebar Role-Based Menu

**File:** `src/admin/layouts/Sidebar.tsx`

Menu items include a `roles` property:

```tsx
interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  roles: UserRole[];  // Only visible to these roles
}

const menuItems = [
  { 
    id: 'content', 
    label: 'Posts & Sermons', 
    path: '/admin/content', 
    roles: [UserRole.ADMIN, UserRole.MODERATOR] 
  },
  { 
    id: 'users', 
    label: 'User Management', 
    path: '/admin/users', 
    roles: [UserRole.ADMIN]  // ADMIN only
  },
  // ...
];
```

Menu rendering with role filtering:

```tsx
{menuItems
  .filter(item => item.roles.includes(user.role))
  .map(item => (
    <MenuItem key={item.id} {...item} />
  ))
}
```

---

## 8. Backend API Protection

### View-Level Permission Classes

**Example: User Management (ADMIN only)**

**File:** `backend/apps/users/views.py`

```python
class AdminUserViewSet(viewsets.ModelViewSet):
    """Admin-only user management"""
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = User.objects.all()
    
    def get_queryset(self):
        # EXCLUDE ADMIN users from management interface
        return User.objects.exclude(role=UserRole.ADMIN)
```

**Example: Content Management (MODERATOR or ADMIN)**

**File:** `backend/apps/content/views.py`

```python
class PostContentTypeViewSet(viewsets.ModelViewSet):
    """Content type management"""
    permission_classes = [IsAuthenticated, IsModerator]
```

**Example: Comments (Authenticated users)**

**File:** `backend/apps/interactions/comment_views.py`

```python
class CommentCreateView(generics.CreateAPIView):
    """Create comment on post"""
    permission_classes = [IsAuthenticated]
```

**Example: Public Content (No authentication)**

```python
class PostListView(generics.ListAPIView):
    """Public post list"""
    permission_classes = [AllowAny]
```

### API Endpoint Protection Matrix

| Endpoint Pattern | Permission Class | Allowed Roles |
|-----------------|------------------|---------------|
| `/api/v1/auth/register/` | AllowAny | All |
| `/api/v1/auth/login/` | AllowAny | All |
| `/api/v1/auth/me/` | IsAuthenticated | All authenticated |
| `/api/v1/posts/` (GET) | AllowAny | All |
| `/api/v1/posts/` (POST) | IsModerator | MODERATOR, ADMIN |
| `/api/v1/admin/users/` | IsAdmin | ADMIN only |
| `/api/v1/comments/` | IsAuthenticated | MEMBER, MODERATOR, ADMIN |
| `/api/v1/reactions/` | IsAuthenticated | MEMBER, MODERATOR, ADMIN |
| `/api/v1/moderation/` | IsModerator | MODERATOR, ADMIN |
| `/api/v1/email-campaigns/` | IsModerator | MODERATOR, ADMIN |
| `/api/v1/payments/admin/` | IsAdmin | ADMIN only |

---

## 9. User Management Capabilities

### ADMIN User Management Dashboard

**Route:** `/admin/users`  
**API:** `/api/v1/admin/users/`  
**Permission:** ADMIN only

### Available Operations

#### 1. List Users

**Endpoint:** `GET /api/v1/admin/users/`

**Query Parameters:**
- `role` - Filter by MEMBER or MODERATOR
- `is_suspended` - Filter suspended accounts
- `email_verified` - Filter by verification status
- `email_subscribed` - Filter by subscription status
- `search` - Search by email, first name, or last name
- `sort_by` - Sort by email, date_joined, last_login, role

**Response:**
```json
{
  "count": 150,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "email": "member@church.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "MEMBER",
      "isActive": true,
      "isSuspended": false,
      "emailVerified": true,
      "dateJoined": "2026-01-15T10:30:00Z",
      "lastLogin": "2026-03-05T14:20:00Z"
    }
  ]
}
```

**Note:** ADMIN users are EXCLUDED from the list for safety.

---

#### 2. View User Details

**Endpoint:** `GET /api/v1/admin/users/{userId}/`

**Response:**
```json
{
  "id": "uuid",
  "email": "member@church.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MEMBER",
  "isActive": true,
  "isSuspended": false,
  "emailVerified": true,
  "emailVerifiedAt": "2026-01-15T11:00:00Z",
  "phoneNumber": "+1234567890",
  "bio": "Active member since 2020",
  "dateJoined": "2026-01-15T10:30:00Z",
  "lastLogin": "2026-03-05T14:20:00Z",
  "activity": {
    "posts_count": 0,
    "comments_count": 24,
    "reactions_count": 156
  }
}
```

---

#### 3. Change User Role

**Endpoint:** `PATCH /api/v1/admin/users/{userId}/`

**Allowed Transitions:**
- MEMBER → MODERATOR
- MODERATOR → MEMBER

**Request:**
```json
{
  "role": "MODERATOR",
  "reason": "Promoted for content team leadership"
}
```

**Validation:**
- Only MEMBER and MODERATOR roles allowed
- Cannot promote to ADMIN via API
- Audit log created automatically

---

#### 4. Suspend User

**Endpoint:** `PATCH /api/v1/admin/users/{userId}/`

**Request:**
```json
{
  "is_suspended": true,
  "reason": "Violation of community guidelines",
  "suspension_expires_at": "2026-04-01T00:00:00Z"  // Optional
}
```

**Effects:**
- User cannot login
- Existing sessions invalidated
- User receives suspension notification (if implemented)
- Audit log created

---

#### 5. Reactivate User

**Endpoint:** `PATCH /api/v1/admin/users/{userId}/`

**Request:**
```json
{
  "is_suspended": false
}
```

**Effects:**
- User can login again
- Suspension metadata cleared
- Audit log created

---

#### 6. Atomic Updates

The system supports **atomic role and suspension changes** in a single request:

**Request:**
```json
{
  "role": "MEMBER",
  "is_suspended": true,
  "reason": "Demoted and suspended for policy violation"
}
```

**Implementation:** Uses Django database transactions to ensure consistency.

---

## 10. Suspension & Account Status System

### Account Status States

```python
@property
def account_status(self) -> str:
    if not self.is_active:
        return 'disabled'
    if self.is_suspended:
        # Check auto-unsuspend
        if self.suspension_expires_at and timezone.now() > self.suspension_expires_at:
            self.is_suspended = False
            self.save()
            return 'active'
        return 'suspended'
    return 'active'
```

### Suspension Features

1. **Manual Suspension:**
   - ADMIN sets `is_suspended = True`
   - ADMIN provides reason
   - Suspended by user tracked (`suspended_by`)
   - Timestamp recorded (`suspended_at`)

2. **Auto-Expiring Suspension:**
   - ADMIN sets `suspension_expires_at`
   - System auto-unsuspends after expiration
   - Checked on each login attempt

3. **Permanent Suspension:**
   - Set `is_suspended = True`
   - Leave `suspension_expires_at = None`
   - Manual reactivation required

### Suspension Methods

```python
def suspend(self, suspended_by, reason, expires_at=None):
    """Suspend user account"""
    self.is_suspended = True
    self.suspended_at = timezone.now()
    self.suspended_by = suspended_by
    self.suspension_reason = reason
    self.suspension_expires_at = expires_at
    self.save()

def unsuspend(self):
    """Remove suspension"""
    self.is_suspended = False
    self.suspended_at = None
    self.suspended_by = None
    self.suspension_reason = None
    self.suspension_expires_at = None
    self.save()
```

---

## 11. Email Verification System

### Verification Flow

**File:** `backend/apps/users/email_verification_views.py`

#### 1. Send Verification Email

**Endpoint:** `POST /api/v1/auth/email-verification/send/`  
**Permission:** Authenticated users only

**Request:** (Empty body)

**Rate Limiting:** 
- Maximum 1 email per 60 seconds
- Checked via `email_verification_sent_at` field

**Process:**
```python
# Generate random token
token = secrets.token_urlsafe(32)

# Hash token for storage
hashed_token = make_password(token)

# Store hashed token
user.email_verification_token = hashed_token
user.email_verification_token_expires_at = timezone.now() + timedelta(hours=24)
user.email_verification_sent_at = timezone.now()
user.save()

# Send email with plain token
verification_url = f"{FRONTEND_URL}/verify-email?token={token}"
send_email(to=user.email, url=verification_url)
```

**Security:**
- Token stored as hash (like passwords)
- 24-hour expiration
- Rate limiting prevents spam

---

#### 2. Verify Email

**Endpoint:** `POST /api/v1/auth/email-verification/verify/`  
**Permission:** Public

**Request:**
```json
{
  "token": "verification_token_from_email"
}
```

**Process:**
```python
# Find user by checking hashed token
for user in users_with_pending_verification:
    if check_password(token, user.email_verification_token):
        # Token matches
        if timezone.now() < user.email_verification_token_expires_at:
            user.email_verified = True
            user.email_verified_at = timezone.now()
            user.email_verification_token = None
            user.email_verification_token_expires_at = None
            user.save()
            return success
        else:
            return "Token expired"
```

---

#### 3. Check Verification Status

**Endpoint:** `GET /api/v1/auth/email-verification/status/`  
**Permission:** Authenticated users only

**Response:**
```json
{
  "email_verified": true,
  "email_verified_at": "2026-01-15T11:00:00Z"
}
```

---

### Email Subscription Management

Users can control email subscriptions independently of verification:

**Field:** `email_subscribed` (Boolean)

**ADMIN can update:**
```json
PATCH /api/v1/admin/users/{userId}/
{
  "email_subscribed": false
}
```

**User can update via profile settings**

---

## 12. Audit & Compliance

### Audit Log System

**Model:** `AuditLog`  
**File:** `backend/apps/moderation/models.py`

**Purpose:** Track all ADMIN and MODERATOR actions

### Tracked Actions

```python
class ActionType(models.TextChoices):
    CREATE = 'CREATE'
    UPDATE = 'UPDATE'
    DELETE = 'DELETE'
    PUBLISH = 'PUBLISH'
    UNPUBLISH = 'UNPUBLISH'
    SUSPEND = 'SUSPEND'
    REACTIVATE = 'REACTIVATE'
    ROLE_CHANGE = 'ROLE_CHANGE'
    EMAIL_SENT = 'EMAIL_SENT'
    COMMENT_DELETE = 'COMMENT_DELETE'
    QUESTION_ANSWER = 'QUESTION_ANSWER'
```

### Audit Log Structure

```python
class AuditLog(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)  # Who performed action
    action_type = CharField(choices=ActionType.choices)
    description = TextField  # Human-readable description
    
    # Generic relation to any model
    content_type = ForeignKey(ContentType)
    object_id = CharField(max_length=255)
    content_object = GenericForeignKey()
    
    # Request metadata
    ip_address = GenericIPAddressField()
    user_agent = CharField(max_length=500)
    metadata = JSONField()  # Additional context
    
    created_at = DateTimeField(auto_now_add=True)
```

### Example: Role Change Audit

```python
AuditLog.objects.create(
    user=request.user,  # ADMIN performing action
    action_type='ROLE_CHANGE',
    content_object=target_user,
    description=f'Changed {target_user.email} role from MEMBER to MODERATOR. Reason: {reason}',
    ip_address=request.META.get('REMOTE_ADDR'),
    user_agent=request.META.get('HTTP_USER_AGENT'),
    metadata={'old_role': 'MEMBER', 'new_role': 'MODERATOR'}
)
```

### Accessing Audit Logs

**Endpoint:** `GET /api/v1/moderation/audit-logs/`  
**Permission:** IsModerator (MODERATOR and ADMIN)

**Filters:**
- By user (who performed action)
- By action type
- By date range
- By affected object

---

## 13. Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────┐
│                    User                     │
├─────────────────────────────────────────────┤
│ id (UUID, PK)                               │
│ email (unique)                              │
│ password (hashed)                           │
│ first_name                                  │
│ last_name                                   │
│ role (VISITOR|MEMBER|MODERATOR|ADMIN)      │
│ is_active                                   │
│ is_staff                                    │
│ is_superuser                                │
│ date_joined                                 │
│ last_login                                  │
│ email_verified                              │
│ email_subscribed                            │
│ is_suspended                                │
│ suspended_by (FK → User)                    │
│ suspended_at                                │
│ suspension_reason                           │
│ suspension_expires_at                       │
└─────────────────────────────────────────────┘
           │
           │ 1:N (author)
           ▼
┌─────────────────────────────────────────────┐
│                    Post                     │
├─────────────────────────────────────────────┤
│ id (UUID, PK)                               │
│ title                                       │
│ content                                     │
│ author (FK → User)                          │
│ content_type (FK → PostContentType)         │
│ status (DRAFT|PUBLISHED)                    │
│ is_published                                │
│ published_at                                │
│ is_featured                                 │
│ comments_enabled                            │
│ reactions_enabled                           │
└─────────────────────────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────────────────────────┐
│                  Comment                    │
├─────────────────────────────────────────────┤
│ id (UUID, PK)                               │
│ post (FK → Post)                            │
│ user (FK → User)                            │
│ content                                     │
│ parent (FK → Comment, nullable)             │
│ is_deleted                                  │
│ deleted_by (FK → User)                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│                 Reaction                    │
├─────────────────────────────────────────────┤
│ id (UUID, PK)                               │
│ post (FK → Post)                            │
│ user (FK → User)                            │
│ reaction_type (LIKE|AMEN|LOVE|INSIGHT|...)  │
│ [unique: (post, user)]                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│                AuditLog                     │
├─────────────────────────────────────────────┤
│ id (UUID, PK)                               │
│ user (FK → User) [who acted]                │
│ action_type                                 │
│ description                                 │
│ content_type (GenericFK)                    │
│ object_id                                   │
│ ip_address                                  │
│ user_agent                                  │
│ metadata (JSON)                             │
│ created_at                                  │
└─────────────────────────────────────────────┘
```

### Key Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| User → Post | 1:N | User creates many posts |
| User → Comment | 1:N | User writes many comments |
| User → Reaction | 1:N | User makes many reactions |
| User → User (suspended_by) | 1:N | ADMIN suspends users |
| Post → Comment | 1:N | Post has many comments |
| Comment → Comment (parent) | 1:N | Threaded replies |
| Post → Reaction | 1:N | Post has many reactions |
| AuditLog → User | N:1 | Actions by user |

### Indexes

**Critical indexes for performance:**

```sql
-- User table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Post table
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_is_published ON posts(is_published);

-- Comment table
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- AuditLog table
CREATE INDEX idx_audit_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action_type, created_at DESC);
```

---

## 14. Security Considerations

### Password Security

- **Hashing:** Django's PBKDF2 algorithm with SHA256
- **Salting:** Automatic per-user salt
- **No Plain Text:** Passwords never stored in plain text

### Token Security

- **JWT Signing:** HMAC-SHA256 with SECRET_KEY
- **Token Expiry:** Access tokens expire in 60 minutes
- **Token Blacklisting:** Refresh tokens blacklisted on logout
- **No Token in URL:** Tokens in Authorization header only

### Role Escalation Prevention

1. **ADMIN users excluded from user management UI**
   - Prevents accidental self-demotion
   - Prevents MODERATOR from seeing ADMIN accounts

2. **API-level role validation**
   - Cannot promote directly to ADMIN via API
   - Only MEMBER ↔ MODERATOR transitions allowed

3. **Double enforcement (UI + API)**
   - Frontend hides unauthorized features
   - Backend returns 403 even if UI bypassed

### Suspension Bypass Prevention

- **Check on every request:** Authentication middleware checks `is_suspended`
- **Token invalidation:** Suspended users' tokens blacklisted
- **Session termination:** Active sessions ended on suspension

### Email Verification Security

- **Token hashing:** Verification tokens hashed like passwords
- **Expiration:** 24-hour validity
- **Rate limiting:** Max 1 email per minute per user
- **Single use:** Token cleared after successful verification

### CSRF Protection

- **JWT requests exempt:** Bearer token authentication bypasses CSRF
- **Custom middleware:** `JWTCSRFExemptMiddleware`
- **Session-based requests protected:** Standard CSRF for Django admin

### SQL Injection Prevention

- **ORM usage:** Django ORM prevents SQL injection
- **Parameterized queries:** All queries use bound parameters
- **No raw SQL:** Minimal use of `.raw()` or `.extra()`

### XSS Prevention

- **React rendering:** Automatic escaping in JSX
- **DOMPurify:** Sanitization for rich text content
- **Content Security Policy:** Headers configured (if implemented)

---

## 15. Migration Path to Multi-Tenancy

If the platform needs to support multiple churches (multi-tenancy), here's the recommended migration path:

### Step 1: Add Organization Model

```python
class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)  # church-name
    subdomain = models.CharField(max_length=63, unique=True)  # For subdomain routing
    
    # Contact
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    # Address
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    
    # Subscription (if SaaS model)
    plan = models.CharField(max_length=20)  # FREE, BASIC, PREMIUM
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Step 2: Add Tenant Field to User

```python
class User(AbstractBaseUser, PermissionsMixin):
    # ... existing fields ...
    
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='users',
        null=True  # For migration
    )
```

### Step 3: Add Tenant Field to All Content

```python
class Post(models.Model):
    # ... existing fields ...
    
    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='posts'
    )
```

### Step 4: Implement Tenant Middleware

```python
class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Extract tenant from subdomain
        host = request.get_host().split(':')[0]
        subdomain = host.split('.')[0]
        
        # Get organization
        organization = Organization.objects.get(subdomain=subdomain)
        request.organization = organization
        
        return self.get_response(request)
```

### Step 5: Add Tenant Filtering

```python
class TenantQuerySet(models.QuerySet):
    def for_tenant(self, organization):
        return self.filter(organization=organization)

class TenantManager(models.Manager):
    def get_queryset(self):
        # Implementation depends on how tenant is tracked
        return super().get_queryset()
```

### Step 6: Database Strategy Options

**Option A: Shared Database, Shared Schema**
- Single PostgreSQL database
- `organization_id` in every table
- Row-level tenant filtering
- Most cost-effective

**Option B: Shared Database, Separate Schemas**
- Single PostgreSQL database
- Separate schema per tenant
- PostgreSQL schema switching
- Better isolation

**Option C: Separate Databases**
- Dedicated database per tenant
- Complete isolation
- Higher complexity and cost
- Best for enterprise

### Estimated Migration Effort

| Task | Effort | Risk |
|------|--------|------|
| Add Organization model | 2 days | Low |
| Migrate existing data | 1 day | Medium |
| Add tenant fields to models | 3 days | Medium |
| Update views and serializers | 5 days | Medium |
| Implement middleware | 2 days | Low |
| Update frontend routing | 3 days | Low |
| Testing and QA | 5 days | High |
| **Total** | **~21 days** | **Medium** |

---

## Appendices

### Appendix A: API Endpoints Reference

**Authentication:**
- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/logout/`
- `GET /api/v1/auth/me/`
- `PATCH /api/v1/auth/me/`
- `POST /api/v1/auth/change-password/`

**Email Verification:**
- `POST /api/v1/auth/email-verification/send/`
- `POST /api/v1/auth/email-verification/verify/`
- `GET /api/v1/auth/email-verification/status/`

**User Management (ADMIN only):**
- `GET /api/v1/admin/users/`
- `GET /api/v1/admin/users/{id}/`
- `PATCH /api/v1/admin/users/{id}/`

**Content (Public):**
- `GET /api/v1/posts/`
- `GET /api/v1/posts/{id}/`
- `GET /api/v1/series/`

**Content Management (MODERATOR+):**
- `POST /api/v1/posts/`
- `PATCH /api/v1/posts/{id}/`
- `DELETE /api/v1/posts/{id}/`
- `POST /api/v1/series/`

**Interactions (Authenticated):**
- `POST /api/v1/reactions/`
- `DELETE /api/v1/reactions/{id}/`
- `POST /api/v1/comments/`
- `PATCH /api/v1/comments/{id}/`
- `DELETE /api/v1/comments/{id}/`

**Moderation (MODERATOR+):**
- `GET /api/v1/moderation/comments/`
- `DELETE /api/v1/moderation/comments/{id}/`
- `GET /api/v1/moderation/reports/`
- `GET /api/v1/moderation/audit-logs/`

**Email Campaigns (MODERATOR+):**
- `GET /api/v1/email-campaigns/`
- `POST /api/v1/email-campaigns/`
- `POST /api/v1/email-campaigns/{id}/send/`

**Payments (ADMIN only):**
- `GET /api/v1/payments/admin/transactions/`
- `GET /api/v1/payments/admin/analytics/`

---

### Appendix B: Environment Variables

**Required:**
- `SECRET_KEY` - Django secret key
- `DATABASE_URL` - PostgreSQL connection string
- `ALLOWED_HOSTS` - Comma-separated host list

**Optional:**
- `DEBUG` - Debug mode (default: False)
- `FRONTEND_URL` - Frontend URL for CORS
- `EMAIL_HOST` - SMTP server
- `EMAIL_PORT` - SMTP port
- `EMAIL_HOST_USER` - SMTP username
- `EMAIL_HOST_PASSWORD` - SMTP password
- `EMAIL_USE_TLS` - Use TLS (default: True)

---

### Appendix C: Useful Management Commands

```bash
# Create superuser (ADMIN)
python manage.py createsuperuser

# List all users
python manage.py shell
>>> from apps.users.models import User
>>> User.objects.all()

# Change user role
>>> user = User.objects.get(email='user@church.com')
>>> user.role = 'MODERATOR'
>>> user.save()

# Suspend user
>>> admin = User.objects.get(email='admin@church.com')
>>> user.suspend(suspended_by=admin, reason='Policy violation')

# View audit logs
>>> from apps.moderation.models import AuditLog
>>> AuditLog.objects.filter(action_type='ROLE_CHANGE')
```

---

## Summary

This **Church Digital Engagement Platform** implements a robust **single-tenant, role-based access control system** with:

✅ **4 User Roles:** VISITOR, MEMBER, MODERATOR, ADMIN  
✅ **JWT Authentication:** Secure token-based auth with blacklisting  
✅ **Multi-Layer Security:** API + UI enforcement  
✅ **Granular Permissions:** Custom DRF permission classes  
✅ **User Management:** ADMIN-only user administration  
✅ **Suspension System:** Temporary and permanent suspensions  
✅ **Email Verification:** Secure token-based verification  
✅ **Audit Trail:** Complete administrative action logging  
✅ **UUID Primary Keys:** Secure, non-sequential identifiers  

The system is **production-ready** for single church deployments and has a **clear migration path** to multi-tenancy if needed.

---

**End of Report**
