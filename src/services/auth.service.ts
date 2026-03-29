/**
 * Authentication Service
 * 
 * Handles user authentication operations:
 * - Login
 * - Registration
 * - Logout
 * - Token management
 */

import { apiService } from './api.service';
import { 
  User, 
  AuthTokens, 
  LoginRequest, 
  RegisterRequest 
} from '../types/auth.types';

const GOOGLE_AUTH_DEBUG =
  process.env.REACT_APP_AUTH_DEBUG === 'true' || process.env.NODE_ENV !== 'production';

const logGoogleAuth = (stage: string, details?: Record<string, unknown>) => {
  if (!GOOGLE_AUTH_DEBUG) {
    return;
  }

  if (details) {
    console.info(`[GOOGLE_AUTH_DEBUG] ${stage}`, details);
    return;
  }

  console.info(`[GOOGLE_AUTH_DEBUG] ${stage}`);
};

const pickFirstNonEmptyString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
};

const toAbsoluteMediaUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  const value = url.trim();
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (!value.startsWith('/')) {
    return value;
  }

  try {
    const base = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';
    const origin = new URL(base).origin;
    return `${origin}${value}`;
  } catch {
    return value;
  }
};

const normalizeUser = (user: any): User => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName ?? user.first_name ?? '',
  lastName: user.lastName ?? user.last_name ?? '',
  role: user.role,
  isActive: user.isActive ?? user.is_active ?? false,
  dateJoined: user.dateJoined ?? user.date_joined ?? '',
  phone: user.phone ?? user.phone_number ?? user.phoneNumber,
  phoneNumber: user.phoneNumber ?? user.phone_number,
  location: user.location,
  website: user.website,
  profilePicture: toAbsoluteMediaUrl(
    pickFirstNonEmptyString(
      user.profilePicture,
      user.profile_picture,
      user.googleProfilePictureUrl,
      user.google_profile_picture_url,
    )
  ),
  bio: user.bio,
  emailVerified: user.emailVerified ?? user.email_verified,
  emailVerifiedAt: user.emailVerifiedAt ?? user.email_verified_at ?? null,
});

class AuthService {
  /**
   * User login
   */
  async login(credentials: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    // Fetch CSRF token before login
    await apiService.fetchCsrfToken();
    
    const response = await apiService.post('auth/login/', credentials);
    
    // Store tokens
    if (response.access && response.refresh) {
      localStorage.setItem('auth_tokens', JSON.stringify({
        access: response.access,
        refresh: response.refresh
      }));
    }
    
    return {
      user: normalizeUser(response.user),
      tokens: {
        access: response.access,
        refresh: response.refresh
      }
    };
  }

  /**
   * Exchange Google ID token for platform JWT tokens.
   */
  async loginWithGoogle(idToken: string): Promise<{ user: User; tokens: AuthTokens }> {
    logGoogleAuth('STAGE 3: sending token to backend /auth/google/', {
      idTokenLength: idToken?.length || 0,
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
    });

    try {
      const response = await apiService.post('auth/google/', { id_token: idToken });

      logGoogleAuth('STAGE 4: backend token exchange succeeded', {
        hasAccessToken: Boolean(response?.access),
        hasRefreshToken: Boolean(response?.refresh),
        role: response?.user?.role,
        email: response?.user?.email,
      });

      if (response.access && response.refresh) {
        localStorage.setItem('auth_tokens', JSON.stringify({
          access: response.access,
          refresh: response.refresh,
        }));
      }

      return {
        user: normalizeUser(response.user),
        tokens: {
          access: response.access,
          refresh: response.refresh,
        },
      };
    } catch (error: any) {
      logGoogleAuth('STAGE 4 FAILED: backend token exchange failed', {
        httpStatus: error?.response?.status,
        backendCode: error?.response?.data?.code,
        backendError: error?.response?.data?.error,
        axiosMessage: error?.message,
        requestUrl: error?.config?.url,
      });
      throw error;
    }
  }

  /**
   * User registration
   */
  async register(data: RegisterRequest): Promise<{ user: User; tokens: AuthTokens }> {
    // Fetch CSRF token before registration
    await apiService.fetchCsrfToken();
    
    const response = await apiService.post('auth/register/', data);
    
    // Store tokens
    if (response.access && response.refresh) {
      localStorage.setItem('auth_tokens', JSON.stringify({
        access: response.access,
        refresh: response.refresh
      }));
    }
    
    return {
      user: normalizeUser(response.user),
      tokens: {
        access: response.access,
        refresh: response.refresh
      }
    };
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    const tokensStr = localStorage.getItem('auth_tokens');
    if (tokensStr) {
      const tokens = JSON.parse(tokensStr);
      try {
        await apiService.post('auth/logout/', { refresh: tokens.refresh });
      } catch (error) {
        // Ignore error, clear tokens anyway
      }
    }
    localStorage.removeItem('auth_tokens');
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const user = await apiService.get('auth/me/');
    return normalizeUser(user);
  }

  /**
   * Request a 6-digit password reset code to be emailed.
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiService.post('auth/password-reset/request/', { email });
  }

  /**
   * Verify the reset code and set a new password.
   */
  async confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await apiService.post('auth/password-reset/confirm/', {
      email,
      code,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokensStr = localStorage.getItem('auth_tokens');
    return !!tokensStr;
  }
}

export const authService = new AuthService();
export default authService;

/**
 * Admin Authentication Service
 * Separate endpoints for admin registration and login
 */

// Prefer env vars; fall back to the old default.
const API_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:8000/api/v1';

interface AdminRegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const adminAuthService = {
  async register(data: AdminRegisterData): Promise<AuthResponse> {
    const url = `${API_URL}/admin-auth/register/`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Registration failed');
      }

      return response.json();
      
    } catch (error) {
      throw error;
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const url = `${API_URL}/admin-auth/login/`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Login failed');
      }

      return response.json();
      
    } catch (error) {
      throw error;
    }
  },
};
