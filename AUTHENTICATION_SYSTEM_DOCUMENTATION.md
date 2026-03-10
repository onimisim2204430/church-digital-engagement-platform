# Authentication System Documentation
**Church Digital Engagement Platform**

*Technical Reference for Lead Engineer*  
*Date: March 7, 2026*

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Architecture](#2-authentication-architecture)
3. [JWT Token System](#3-jwt-token-system)
4. [Authentication Flow](#4-authentication-flow)
5. [API Endpoints](#5-api-endpoints)
6. [Request/Response Payloads](#6-requestresponse-payloads)
7. [Frontend Implementation](#7-frontend-implementation)
8. [Token Storage & Management](#8-token-storage--management)
9. [Token Refresh Mechanism](#9-token-refresh-mechanism)
10. [CSRF Protection](#10-csrf-protection)
11. [Security Measures](#11-security-measures)
12. [Error Handling](#12-error-handling)
13. [Code Examples](#13-code-examples)

---

## 1. Overview

The **Church Digital Engagement Platform** uses a **JWT (JSON Web Token) based authentication system** with the following characteristics:

### Key Features

- ✅ **Stateless Authentication:** No server-side session storage
- ✅ **Token-Based:** Access tokens (short-lived) + Refresh tokens (long-lived)
- ✅ **Token Rotation:** New refresh token issued on each refresh
- ✅ **Token Blacklisting:** Logout invalidates refresh tokens
- ✅ **Auto-Refresh:** Frontend automatically refreshes expired tokens
- ✅ **CSRF Exempt:** JWT in Authorization header bypasses CSRF
- ✅ **Role-Based:** User role embedded in token claims

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend Auth** | Django + djangorestframework-simplejwt |
| **Token Algorithm** | HMAC-SHA256 (HS256) |
| **Token Storage** | Browser localStorage (frontend) |
| **Token Blacklist** | Django database (backend) |
| **Frontend HTTP Client** | Axios with interceptors |
| **Password Hashing** | PBKDF2-SHA256 (Django default) |

---

## 2. Authentication Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │ AuthContext  │───────▶│ AuthService  │                  │
│  │  (State)     │        │  (API Calls) │                  │
│  └──────────────┘        └──────┬───────┘                  │
│                                  │                          │
│                          ┌───────▼────────┐                │
│                          │  API Service   │                │
│                          │  (Interceptors)│                │
│                          └───────┬────────┘                │
│                                  │                          │
└──────────────────────────────────┼──────────────────────────┘
                                   │
                    HTTP Request with JWT Token
                    Authorization: Bearer <token>
                                   │
┌──────────────────────────────────▼──────────────────────────┐
│                    Backend (Django)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌─────────────────────┐         │
│  │ JWTCSRFExempt    │─────▶│ JWTAuthentication   │         │
│  │ Middleware       │      │ (DRF SimpleJWT)     │         │
│  └──────────────────┘      └─────────┬───────────┘         │
│                                      │                      │
│                            ┌─────────▼──────────┐           │
│                            │  Permission Check  │           │
│                            │  (IsAdmin, etc.)   │           │
│                            └─────────┬──────────┘           │
│                                      │                      │
│                            ┌─────────▼──────────┐           │
│                            │   View/Endpoint    │           │
│                            │   (Business Logic) │           │
│                            └────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Layers

1. **Frontend Layer:**
   - AuthContext (React Context API) - Global auth state
   - AuthService - API communication
   - API Service - HTTP client with interceptors
   - Token storage in localStorage

2. **Transport Layer:**
   - HTTP headers: `Authorization: Bearer <access_token>`
   - JSON payloads for credentials
   - CORS enabled for cross-origin requests

3. **Backend Layer:**
   - JWTCSRFExemptMiddleware - Bypass CSRF for JWT
   - JWTAuthentication - Validate and decode tokens
   - Permission classes - Role-based access control
   - Views - Handle authentication logic

---

## 3. JWT Token System

### Token Types

The system uses **two types of tokens**:

#### 1. Access Token

| Property | Value |
|----------|-------|
| **Purpose** | Authenticate API requests |
| **Lifetime** | 60 minutes (configurable) |
| **Storage** | localStorage (`auth_tokens.access`) |
| **Usage** | Sent in Authorization header on every request |
| **Renewal** | Cannot be renewed directly; must use refresh token |

#### 2. Refresh Token

| Property | Value |
|----------|-------|
| **Purpose** | Obtain new access tokens |
| **Lifetime** | 24 hours / 1440 minutes (configurable) |
| **Storage** | localStorage (`auth_tokens.refresh`) |
| **Usage** | Sent to `/auth/refresh/` to get new access token |
| **Rotation** | New refresh token issued on each refresh |
| **Blacklist** | Old refresh token blacklisted after rotation |

### JWT Configuration (Backend)

**File:** `backend/config/settings.py`

```python
SIMPLE_JWT = {
    # Token lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),        # 1 hour
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=1440),     # 24 hours
    
    # Token rotation
    'ROTATE_REFRESH_TOKENS': True,                         # Issue new refresh on refresh
    'BLACKLIST_AFTER_ROTATION': True,                      # Blacklist old refresh token
    'UPDATE_LAST_LOGIN': True,                             # Update User.last_login
    
    # Cryptography
    'ALGORITHM': 'HS256',                                  # HMAC-SHA256
    'SIGNING_KEY': SECRET_KEY,                             # From environment
    'VERIFYING_KEY': None,                                 # Symmetric encryption
    
    # HTTP headers
    'AUTH_HEADER_TYPES': ('Bearer',),                      # Authorization: Bearer <token>
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # Token claims
    'USER_ID_FIELD': 'id',                                 # User.id (UUID)
    'USER_ID_CLAIM': 'user_id',                            # Claim name in JWT
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}
```

### Token Structure

**Decoded JWT Access Token:**

```json
{
  "token_type": "access",
  "exp": 1741438800,          // Expiration timestamp (Unix epoch)
  "iat": 1741435200,          // Issued at timestamp
  "jti": "abc123...",         // Unique token ID
  "user_id": "550e8400-e29b-41d4-a716-446655440000"  // User UUID
}
```

**Note:** User role is NOT in the token. Backend queries the database on each request to get the latest user role. This ensures role changes take effect immediately without waiting for token expiration.

### Token Blacklist

**Database Table:** `token_blacklist_outstandingtoken` and `token_blacklist_blacklistedtoken`

When a user logs out or a refresh token is rotated:
1. Refresh token is added to blacklist table
2. Subsequent use of blacklisted token returns 401 Unauthorized
3. Cleanup job removes expired tokens periodically

---

## 4. Authentication Flow

### 4.1 Registration Flow

```
┌─────────┐                                              ┌─────────┐
│ Frontend│                                              │ Backend │
└────┬────┘                                              └────┬────┘
     │                                                        │
     │  POST /api/v1/auth/register/                          │
     │  {                                                    │
     │    "email": "user@church.com",                        │
     │    "password": "SecurePass123",                       │
     │    "password_confirm": "SecurePass123",               │
     │    "first_name": "John",                              │
     │    "last_name": "Doe"                                 │
     │  }                                                    │
     ├──────────────────────────────────────────────────────▶│
     │                                                        │
     │                                    Validate password  │
     │                                    Check email unique │
     │                                    Hash password      │
     │                                    Create User        │
     │                                    Set role=VISITOR   │
     │                                    Generate JWT tokens│
     │                                                        │
     │  200 OK                                               │
     │  {                                                    │
     │    "user": {                                          │
     │      "id": "uuid",                                    │
     │      "email": "user@church.com",                      │
     │      "role": "VISITOR",                               │
     │      ...                                              │
     │    },                                                 │
     │    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",           │
     │    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."           │
     │  }                                                    │
     │◀──────────────────────────────────────────────────────┤
     │                                                        │
     │  Store tokens in localStorage                         │
     │  Update AuthContext state                             │
     │  Redirect to /member or /admin                        │
     │                                                        │
```

### 4.2 Login Flow

```
┌─────────┐                                              ┌─────────┐
│ Frontend│                                              │ Backend │
└────┬────┘                                              └────┬────┘
     │                                                        │
     │  POST /api/v1/auth/login/                             │
     │  {                                                    │
     │    "email": "user@church.com",                        │
     │    "password": "SecurePass123"                        │
     │  }                                                    │
     ├──────────────────────────────────────────────────────▶│
     │                                                        │
     │                                    Authenticate user  │
     │                                    Check is_active    │
     │                                    Check is_suspended │
     │                                    Generate JWT tokens│
     │                                    Update last_login  │
     │                                                        │
     │  200 OK                                               │
     │  {                                                    │
     │    "user": {...},                                     │
     │    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",           │
     │    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."           │
     │  }                                                    │
     │◀──────────────────────────────────────────────────────┤
     │                                                        │
     │  Store tokens in localStorage                         │
     │  Update AuthContext state                             │
     │  Redirect based on user.role                          │
     │                                                        │
```

### 4.3 Authenticated Request Flow

```
┌─────────┐                                              ┌─────────┐
│ Frontend│                                              │ Backend │
└────┬────┘                                              └────┬────┘
     │                                                        │
     │  GET /api/v1/posts/                                   │
     │  Headers:                                             │
     │    Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...  │
     ├──────────────────────────────────────────────────────▶│
     │                                                        │
     │                           JWTCSRFExemptMiddleware     │
     │                           → Bypass CSRF check         │
     │                                                        │
     │                           JWTAuthentication           │
     │                           → Decode token              │
     │                           → Extract user_id           │
     │                           → Query User from DB        │
     │                           → Attach to request.user    │
     │                                                        │
     │                           Permission Check            │
     │                           → Verify user.role          │
     │                           → Check is_suspended        │
     │                                                        │
     │                           View/Endpoint               │
     │                           → Execute business logic    │
     │                                                        │
     │  200 OK                                               │
     │  { "results": [...] }                                 │
     │◀──────────────────────────────────────────────────────┤
     │                                                        │
```

### 4.4 Token Refresh Flow

```
┌─────────┐                                              ┌─────────┐
│ Frontend│                                              │ Backend │
└────┬────┘                                              └────┬────┘
     │                                                        │
     │  GET /api/v1/posts/ (Access token expired)           │
     │  Authorization: Bearer <expired_access_token>         │
     ├──────────────────────────────────────────────────────▶│
     │                                                        │
     │  401 Unauthorized                                     │
     │  { "detail": "Token is invalid or expired" }          │
     │◀──────────────────────────────────────────────────────┤
     │                                                        │
     │  (Interceptor catches 401)                            │
     │                                                        │
     │  POST /api/v1/auth/refresh/                           │
     │  {                                                    │
     │    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."           │
     │  }                                                    │
     ├──────────────────────────────────────────────────────▶│
     │                                                        │
     │                                    Validate refresh   │
     │                                    Check blacklist    │
     │                                    Generate new access│
     │                                    Generate new refresh│
     │                                    Blacklist old refresh│
     │                                                        │
     │  200 OK                                               │
     │  {                                                    │
     │    "access": "eyJ0eXAiOiJKV1Qi...",  [NEW]           │
     │    "refresh": "eyJ0eXAiOiJKV1Qi..."  [NEW]           │
     │  }                                                    │
     │◀──────────────────────────────────────────────────────┤
     │                                                        │
     │  Update localStorage with new tokens                  │
     │                                                        │
     │  RETRY: GET /api/v1/posts/                            │
     │  Authorization: Bearer <new_access_token>             │
     ├──────────────────────────────────────────────────────▶│
     │                                                        │
     │  200 OK                                               │
     │  { "results": [...] }                                 │
     │◀──────────────────────────────────────────────────────┤
     │                                                        │
```

### 4.5 Logout Flow

```
┌─────────┐                                              ┌─────────┐
│ Frontend│                                              │ Backend │
└────┬────┘                                              └────┬────┘
     │                                                        │
     │  POST /api/v1/auth/logout/                            │
     │  {                                                    │
     │    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."           │
     │  }                                                    │
     ├──────────────────────────────────────────────────────▶│
     │                                                        │
     │                                    Blacklist refresh  │
     │                                                        │
     │  205 Reset Content                                    │
     │  { "message": "Successfully logged out" }             │
     │◀──────────────────────────────────────────────────────┤
     │                                                        │
     │  Clear localStorage:                                  │
     │    - auth_tokens                                      │
     │    - access_token                                     │
     │    - refresh_token                                    │
     │    - user                                             │
     │                                                        │
     │  Update AuthContext state                             │
     │  Redirect to /login                                   │
     │                                                        │
```

---

## 5. API Endpoints

### Authentication Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/v1/auth/register/` | POST | No | User registration |
| `/api/v1/auth/login/` | POST | No | User login |
| `/api/v1/auth/logout/` | POST | Yes | User logout (blacklist token) |
| `/api/v1/auth/refresh/` | POST | No | Refresh access token |
| `/api/v1/auth/me/` | GET | Yes | Get current user profile |
| `/api/v1/auth/me/` | PATCH | Yes | Update current user profile |
| `/api/v1/auth/change-password/` | POST | Yes | Change user password |
| `/api/v1/auth/csrf/` | GET | No | Get CSRF token (legacy) |

### Email Verification Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/v1/auth/verify-email/initiate/` | POST | Yes | Send verification email |
| `/api/v1/auth/verify-email/resend/` | POST | Yes | Resend verification email |
| `/api/v1/auth/verify-email/` | POST | No | Verify email with token |

### Admin Authentication (Separate)

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/v1/admin-auth/register/` | POST | No | Admin registration |
| `/api/v1/admin-auth/login/` | POST | No | Admin login |

---

## 6. Request/Response Payloads

### 6.1 Registration

**Request:**
```http
POST /api/v1/auth/register/
Content-Type: application/json

{
  "email": "john.doe@church.com",
  "password": "SecurePassword123!",
  "password_confirm": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890"  // Optional
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Minimum 8 characters, cannot be too common
- `password_confirm`: Must match password
- `first_name`: Required, max 150 characters
- `last_name`: Required, max 150 characters
- `phone_number`: Optional, max 20 characters

**Success Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@church.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "role": "VISITOR",
    "is_active": true,
    "date_joined": "2026-03-07T10:30:00Z",
    "phone_number": "+1234567890",
    "profile_picture": null,
    "bio": null,
    "email_verified": false,
    "email_verified_at": null
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQxNDM4ODAwLCJpYXQiOjE3NDE0MzUyMDAsImp0aSI6ImFiYzEyMyIsInVzZXJfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAifQ.abc123...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc0MTUyMTYwMCwiaWF0IjoxNzQxNDM1MjAwLCJqdGkiOiJ4eXo3ODkiLCJ1c2VyX2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIn0.xyz789..."
}
```

**Error Response (400 Bad Request):**
```json
{
  "email": ["User with this email already exists."],
  "password_confirm": ["Passwords do not match."],
  "password": ["This password is too common."]
}
```

---

### 6.2 Login

**Request:**
```http
POST /api/v1/auth/login/
Content-Type: application/json

{
  "email": "john.doe@church.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@church.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "role": "MEMBER",
    "is_active": true,
    "date_joined": "2026-01-15T10:30:00Z",
    "phone_number": "+1234567890",
    "profile_picture": "https://storage.example.com/profile.jpg",
    "bio": "Active church member since 2020",
    "email_verified": true,
    "email_verified_at": "2026-01-15T11:00:00Z"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Unable to log in with provided credentials."
}
```

**Error Response - Suspended Account (400 Bad Request):**
```json
{
  "error": "User account is disabled."
}
```

---

### 6.3 Token Refresh

**Request:**
```http
POST /api/v1/auth/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Success Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1Qi...",  // NEW access token
  "refresh": "eyJ0eXAiOiJKV1Qi..."  // NEW refresh token (rotated)
}
```

**Error Response - Blacklisted Token (401 Unauthorized):**
```json
{
  "detail": "Token is blacklisted",
  "code": "token_not_valid"
}
```

**Error Response - Expired Token (401 Unauthorized):**
```json
{
  "detail": "Token is invalid or expired",
  "code": "token_not_valid"
}
```

---

### 6.4 Logout

**Request:**
```http
POST /api/v1/auth/logout/
Content-Type: application/json
Authorization: Bearer eyJ0eXAiOiJKV1Qi...

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Success Response (205 Reset Content):**
```json
{
  "message": "Successfully logged out"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Refresh token is required"
}
```

---

### 6.5 Get Current User

**Request:**
```http
GET /api/v1/auth/me/
Authorization: Bearer eyJ0eXAiOiJKV1Qi...
```

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@church.com",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "role": "MEMBER",
  "is_active": true,
  "date_joined": "2026-01-15T10:30:00Z",
  "phone_number": "+1234567890",
  "profile_picture": "https://storage.example.com/profile.jpg",
  "bio": "Active church member since 2020",
  "email_verified": true,
  "email_verified_at": "2026-01-15T11:00:00Z"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

### 6.6 Update Profile

**Request:**
```http
PATCH /api/v1/auth/me/
Content-Type: application/json
Authorization: Bearer eyJ0eXAiOiJKV1Qi...

{
  "first_name": "Jonathan",
  "bio": "Passionate about worship ministry",
  "phone_number": "+1987654321"
}
```

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@church.com",
  "first_name": "Jonathan",
  "last_name": "Doe",
  "full_name": "Jonathan Doe",
  "role": "MEMBER",
  "is_active": true,
  "date_joined": "2026-01-15T10:30:00Z",
  "phone_number": "+1987654321",
  "profile_picture": null,
  "bio": "Passionate about worship ministry",
  "email_verified": true,
  "email_verified_at": "2026-01-15T11:00:00Z"
}
```

---

### 6.7 Change Password

**Request:**
```http
POST /api/v1/auth/change-password/
Content-Type: application/json
Authorization: Bearer eyJ0eXAiOiJKV1Qi...

{
  "old_password": "SecurePassword123!",
  "new_password": "NewSecurePassword456!",
  "new_password_confirm": "NewSecurePassword456!"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "old_password": ["Old password is incorrect."],
  "new_password_confirm": ["New passwords do not match."]
}
```

---

## 7. Frontend Implementation

### 7.1 AuthContext (State Management)

**File:** `src/auth/AuthContext.tsx`

```typescript
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ role: string } | void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

**Usage in Components:**
```typescript
import { useAuth } from '../auth/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <div>Welcome, {user?.firstName}!</div>;
};
```

---

### 7.2 AuthService (API Communication)

**File:** `src/services/auth.service.ts`

```typescript
class AuthService {
  async login(credentials: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiService.post('/auth/login/', credentials);
    
    // Store tokens
    localStorage.setItem('auth_tokens', JSON.stringify({
      access: response.access,
      refresh: response.refresh
    }));
    
    return {
      user: normalizeUser(response.user),
      tokens: {
        access: response.access,
        refresh: response.refresh
      }
    };
  }
  
  async logout(): Promise<void> {
    const tokensStr = localStorage.getItem('auth_tokens');
    if (tokensStr) {
      const tokens = JSON.parse(tokensStr);
      await apiService.post('/auth/logout/', { refresh: tokens.refresh });
    }
    localStorage.removeItem('auth_tokens');
  }
  
  isAuthenticated(): boolean {
    const tokensStr = localStorage.getItem('auth_tokens');
    return !!tokensStr;
  }
}
```

---

### 7.3 API Service (HTTP Client)

**File:** `src/services/api.service.ts`

```typescript
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'http://localhost:8000/api/v1',
      headers: {
        'Accept': 'application/json',
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // REQUEST INTERCEPTOR - Attach JWT token
    this.client.interceptors.request.use(
      (config) => {
        const tokens = this.getTokens();
        if (tokens?.access) {
          config.headers.Authorization = `Bearer ${tokens.access}`;
        }
        return config;
      }
    );

    // RESPONSE INTERCEPTOR - Auto-refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = this.getTokens();
            if (tokens?.refresh) {
              // Refresh token
              const newTokens = await this.refreshToken(tokens.refresh);
              this.setTokens(newTokens);
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed - logout
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
      refresh: refreshToken,
    });
    return response.data;  // { access, refresh }
  }
}
```

---

## 8. Token Storage & Management

### Storage Strategy

**Location:** Browser `localStorage`

**Key:** `auth_tokens`

**Value:**
```json
{
  "access": "eyJ0eXAiOiJKV1Qi...",
  "refresh": "eyJ0eXAiOiJKV1Qi..."
}
```

### Storage Operations

```typescript
// Store tokens
localStorage.setItem('auth_tokens', JSON.stringify({
  access: accessToken,
  refresh: refreshToken
}));

// Retrieve tokens
const tokensStr = localStorage.getItem('auth_tokens');
const tokens = tokensStr ? JSON.parse(tokensStr) : null;

// Clear tokens (logout)
localStorage.removeItem('auth_tokens');
localStorage.removeItem('access_token');  // Legacy
localStorage.removeItem('refresh_token'); // Legacy
localStorage.removeItem('user');          // Cached user data
```

### Security Considerations

**LocalStorage Pros:**
- Persists across browser sessions
- Accessible to JavaScript
- Simple API

**LocalStorage Cons:**
- ⚠️ Vulnerable to XSS attacks
- Not accessible to service workers (for offline support)

**Mitigation Strategies:**
1. **Content Security Policy (CSP):** Prevent inline script execution
2. **HttpOnly Cookies (Alternative):** More secure but requires CORS credentials
3. **Short token lifetimes:** Limit exposure window
4. **Token rotation:** New refresh token on each refresh
5. **HTTPS only:** Prevent token interception

---

## 9. Token Refresh Mechanism

### Auto-Refresh Flow

The frontend automatically refreshes expired access tokens without user intervention:

1. **API Request Fails with 401**
   - Axios interceptor catches the error
   - Checks if `_retry` flag is not set (prevent infinite loops)

2. **Refresh Token Request**
   - Extract refresh token from localStorage
   - POST to `/auth/refresh/` with refresh token
   - Receive new access + refresh tokens

3. **Update Storage**
   - Store new tokens in localStorage
   - Replace old tokens

4. **Retry Original Request**
   - Attach new access token to Authorization header
   - Retry the failed request
   - Return response to original caller

5. **Handle Refresh Failure**
   - If refresh token is expired or blacklisted
   - Clear all tokens from storage
   - Redirect user to /login

### Code Implementation

```typescript
// Response interceptor in API Service
this.client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Check for 401 and ensure we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;  // Prevent infinite loop

      try {
        // Get refresh token from storage
        const tokens = this.getTokens();
        
        if (tokens?.refresh) {
          // Call refresh endpoint
          const newTokens = await this.refreshToken(tokens.refresh);
          
          // Update storage
          this.setTokens(newTokens);
          
          // Update request header
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          }
          
          // Retry original request
          return this.client(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear auth state and redirect
        this.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // For other errors, just reject
    return Promise.reject(error);
  }
);
```

### Refresh Token Rotation

**Backend Behavior:**

When `/auth/refresh/` is called:
1. Validate the provided refresh token
2. Generate a **new access token**
3. Generate a **new refresh token**
4. **Blacklist the old refresh token**
5. Return both new tokens

**Frontend Behavior:**

```typescript
// Old tokens
const oldTokens = {
  access: "eyJ...old_access",
  refresh: "eyJ...old_refresh"
};

// Call refresh endpoint
const newTokens = await refreshToken(oldTokens.refresh);

// New tokens received
const newTokens = {
  access: "eyJ...new_access",
  refresh: "eyJ...new_refresh"
};

// Old refresh token is now blacklisted and cannot be reused
```

**Security Benefit:**  
If an attacker steals a refresh token, it can only be used once. After the legitimate user refreshes, the stolen token is blacklisted.

---

## 10. CSRF Protection

### JWT and CSRF

**Traditional CSRF Attack:**
- Relies on browser automatically sending cookies
- Attacker creates malicious form that submits to victim site
- Browser sends user's session cookie
- Backend thinks request is legitimate

**JWT Protection:**
- JWT tokens are stored in localStorage, NOT cookies
- Browser does NOT automatically send localStorage data
- Attacker cannot access localStorage from their domain (Same-Origin Policy)
- Therefore, JWT is inherently CSRF-resistant

### Implementation

**Backend Middleware:**

**File:** `backend/config/middleware.py`

```python
class JWTCSRFExemptMiddleware:
    """
    Bypass CSRF validation for requests authenticated with JWT Bearer tokens.
    
    JWT tokens in the Authorization header are not vulnerable to CSRF attacks
    because JavaScript from another domain cannot access localStorage or
    modify request headers due to Same-Origin Policy.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if request has JWT Bearer token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            # Mark request as CSRF-exempt
            setattr(request, '_dont_enforce_csrf_checks', True)
        
        return self.get_response(request)
```

**Middleware Order (Critical):**

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'config.middleware.JWTCSRFExemptMiddleware',  # BEFORE CSRF
    'django.middleware.csrf.CsrfViewMiddleware',  # AFTER JWT exempt
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

**Why Order Matters:**
1. `AuthenticationMiddleware` sets `request.user`
2. `JWTCSRFExemptMiddleware` checks for Bearer token
3. `CsrfViewMiddleware` skips validation if exempted

### CORS Configuration

**File:** `backend/config/settings.py`

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://church-digital-engagement-platform.onrender.com',
]

CORS_ALLOW_CREDENTIALS = False  # JWT only, no cookies

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
    'authorization',  # Critical for JWT
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

---

## 11. Security Measures

### 11.1 Password Security

**Hashing Algorithm:** PBKDF2-SHA256 (Django default)

**Implementation:**
```python
# Registration
user = User.objects.create_user(
    email=email,
    password=password  # Automatically hashed
)

# Login
user = authenticate(email=email, password=password)
# Django compares hashed password
```

**Password Validation:**
```python
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
```

**Rules:**
- Minimum 8 characters
- Cannot be entirely numeric
- Cannot be too similar to user attributes
- Cannot be in common passwords list

---

### 11.2 Token Security

**Signing:**
- Algorithm: HMAC-SHA256
- Secret key loaded from environment variable
- Symmetric encryption (same key for signing and verification)

**Expiration:**
- Access token: 60 minutes
- Refresh token: 24 hours
- Enforced by JWT library, cannot be bypassed

**Blacklisting:**
- Logout immediately invalidates refresh token
- Rotation adds old tokens to blacklist
- Blacklisted tokens rejected with 401

---

### 11.3 Account Security

**Suspension System:**
```python
# Check on every request
if user.is_suspended:
    return Response({'error': 'Account suspended'}, status=403)
```

**Failed Login Protection:**
- Not currently implemented
- **Recommendation:** Add rate limiting on login endpoint
- **Implementation:** Track failed attempts, temporary lockout after 5 failures

**Email Verification:**
- New users start with `email_verified=False`
- Verification tokens are hashed before storage
- Tokens expire after 24 hours
- Rate limited to 1 email per 60 seconds

---

### 11.4 XSS Protection

**Frontend:**
- React auto-escapes JSX output
- User-generated content sanitized with DOMPurify
- No `dangerouslySetInnerHTML` without sanitization

**Backend:**
- Django templates auto-escape variables
- API returns JSON (not HTML)
- Content-Type headers enforced

---

### 11.5 Rate Limiting

**Email Verification Endpoints:**

**File:** `backend/config/middleware.py`

```python
RATE_LIMITS = {
    '/api/v1/users/auth/verify-email/initiate/': (5, 3600),  # 5 per hour
    '/api/v1/users/auth/verify-email/resend/': (5, 3600),
    '/api/v1/users/auth/verify-email/verify/': (10, 3600),
}
```

**Recommendation:** Extend to login, registration, and password reset endpoints.

---

## 12. Error Handling

### 12.1 Backend Error Responses

**401 Unauthorized - Not Authenticated:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "detail": "Token is invalid or expired",
  "code": "token_not_valid"
}
```

**403 Forbidden - Insufficient Permissions:**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

**400 Bad Request - Validation Error:**
```json
{
  "email": ["This field is required."],
  "password": ["This password is too short."]
}
```

**429 Too Many Requests - Rate Limit:**
```json
{
  "error": "Rate limit exceeded. Too many requests.",
  "retry_after_seconds": 3600
}
```

---

### 12.2 Frontend Error Handling

**Login Error:**
```typescript
try {
  await login(email, password);
  navigate('/member');
} catch (error) {
  if (error.response?.status === 400) {
    setError('Invalid email or password');
  } else if (error.response?.status === 403) {
    setError('Account suspended. Contact administrator.');
  } else {
    setError('Login failed. Please try again.');
  }
}
```

**Token Refresh Error:**
```typescript
// In API service interceptor
catch (refreshError) {
  // Clear auth state
  localStorage.removeItem('auth_tokens');
  
  // Redirect to login
  window.location.href = '/login';
  
  return Promise.reject(refreshError);
}
```

**Network Error:**
```typescript
try {
  const data = await apiService.get('/posts/');
} catch (error) {
  if (!error.response) {
    // Network error - no response from server
    setError('Network error. Check your connection.');
  } else {
    setError('Failed to load data. Please try again.');
  }
}
```

---

## 13. Code Examples

### 13.1 Backend: Custom User Authentication

**File:** `backend/apps/users/views.py`

```python
class UserLoginView(APIView):
    """User login endpoint."""
    permission_classes = [permissions.AllowAny]
    serializer_class = UserLoginSerializer
    
    def post(self, request):
        serializer = UserLoginSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_200_OK)
```

---

### 13.2 Backend: Token Blacklist on Logout

**File:** `backend/apps/users/views.py`

```python
class UserLogoutView(APIView):
    """User logout endpoint."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response(
                {'message': 'Successfully logged out'}, 
                status=status.HTTP_205_RESET_CONTENT
            )
        except Exception:
            return Response(
                {'error': 'Invalid token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
```

---

### 13.3 Frontend: Protected Route

**File:** `src/router/ProtectedRoute.tsx`

```typescript
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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

**Usage:**
```typescript
<Route 
  path="/admin" 
  element={
    <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.MODERATOR]}>
      <AdminLayout />
    </ProtectedRoute>
  }
/>
```

---

### 13.4 Frontend: Login Form

```typescript
const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(email, password);
      
      // Redirect based on role
      if (result?.role === UserRole.ADMIN || result?.role === UserRole.MODERATOR) {
        navigate('/admin');
      } else {
        navigate('/member');
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError('Invalid email or password');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
};
```

---

## Summary

The **Church Digital Engagement Platform** implements a robust, production-ready JWT authentication system with:

✅ **Stateless Architecture:** No server sessions, fully token-based  
✅ **Automatic Token Refresh:** Seamless UX, no forced logouts  
✅ **Token Rotation:** Security through refresh token rotation  
✅ **Blacklist on Logout:** Immediate token invalidation  
✅ **CSRF Protection:** JWT inherently CSRF-resistant  
✅ **Role-Based Access:** User role enforced on every request  
✅ **Password Security:** PBKDF2-SHA256 hashing with validation  
✅ **Rate Limiting:** Protection against abuse  
✅ **Email Verification:** Secure token-based verification  

The system balances **security**, **user experience**, and **developer experience** while maintaining clean separation between frontend and backend concerns.

---

**End of Authentication Documentation**
