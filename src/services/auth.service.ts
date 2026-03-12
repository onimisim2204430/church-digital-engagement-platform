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
  profilePicture: user.profilePicture ?? user.profile_picture,
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
    
    const response = await apiService.post('/auth/login/', credentials);
    
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
   * User registration
   */
  async register(data: RegisterRequest): Promise<{ user: User; tokens: AuthTokens }> {
    // Fetch CSRF token before registration
    await apiService.fetchCsrfToken();
    
    console.log('Registration data being sent:', data);
    const response = await apiService.post('/auth/register/', data);
    
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
        await apiService.post('/auth/logout/', { refresh: tokens.refresh });
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
    const user = await apiService.get('/auth/me/');
    return normalizeUser(user);
  }

  /**
   * Request a 6-digit password reset code to be emailed.
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiService.post('/auth/password-reset/request/', { email });
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
    await apiService.post('/auth/password-reset/confirm/', {
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
    console.log('Register URL:', url);
    
    try {
      // First check with a simple OPTIONS request
      const testResponse = await fetch(url, { method: 'OPTIONS' });
      console.log('OPTIONS Response:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        headers: Object.fromEntries(testResponse.headers.entries())
      });
      
      // Now try the POST
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',  // Add this
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      });

      console.log('POST Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url  // Check if URL changed
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Registration error:', error);
        throw new Error(error || 'Registration failed');
      }

      return response.json();
      
    } catch (error) {
      console.error('Network error:', error);
      throw error;
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const url = `${API_URL}/admin-auth/login/`;
    console.log('Login URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login Response:', {
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Login error:', error);
        throw new Error(error || 'Login failed');
      }

      return response.json();
      
    } catch (error) {
      console.error('Login network error:', error);
      throw error;
    }
  },
};
