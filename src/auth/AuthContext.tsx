/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application.
 *
 * KEY RULE for MODERATORs:
 *   The member login endpoint (/auth/login/) issues a bare JWT with NO
 *   permissions claim.  Any code that reads permissions from the JWT will
 *   get [].  Therefore every code path that sets or refreshes permissions
 *   for a MODERATOR MUST fetch from the DB (/auth/my-permissions/) instead.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { AuthState } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { getPermissionsFromToken } from '../utils/jwt';
import axios from 'axios';
import { googleLogout } from '@react-oauth/google';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:8000/api/v1';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ role: string } | void>;
  loginWithGoogle: (idToken: string) => Promise<{ role: string } | void>;
  loginWithTokens: (
    user: import('../types/auth.types').User,
    tokens: import('../types/auth.types').AuthTokens
  ) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/** Fetch permissions from the DB for a MODERATOR. Never reads the JWT. */
async function fetchDbPermissions(accessToken: string): Promise<string[]> {
  try {
    const resp = await axios.get(`${API_BASE_URL}/auth/my-permissions/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return resp.data.permissions ?? [];
  } catch {
    return [];
  }
}

/** Get the stored access token from localStorage. */
function getStoredAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) return JSON.parse(raw).access ?? null;
  } catch {}
  return localStorage.getItem('access_token');
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    permissions: [],
  });
  const refreshInFlight = useRef(false);

  // ─── Load user on app mount ────────────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!authService.isAuthenticated()) {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const user = await authService.getCurrentUser();
        const tokensStr = localStorage.getItem('auth_tokens');
        const tokens = tokensStr ? JSON.parse(tokensStr) : null;

        // MODERATOR: always fetch from DB — JWT has no permissions claim
        // ADMIN: no permission codes needed, role check is enough
        let permissions: string[] = [];
        if (user.role === 'MODERATOR' && tokens?.access) {
          permissions = await fetchDbPermissions(tokens.access);
        }

        setAuthState({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
          permissions,
        });
      } catch {
        localStorage.removeItem('auth_tokens');
        setAuthState({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          permissions: [],
        });
      }
    };

    loadUser();
  }, []);

  // ─── login() ───────────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string
  ): Promise<{ role: string } | void> => {
    const { user, tokens } = await authService.login({ email, password });

    // Member login JWT has no permissions claim — fetch from DB for MODERATORs
    let permissions: string[] = getPermissionsFromToken(tokens.access);
    if (user.role === 'MODERATOR') {
      permissions = await fetchDbPermissions(tokens.access);
    }

    setAuthState({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      permissions,
    });
    return { role: user.role };
  };

  // ─── loginWithGoogle() ────────────────────────────────────────────────────
  const loginWithGoogle = async (idToken: string): Promise<{ role: string } | void> => {
    const { user, tokens } = await authService.loginWithGoogle(idToken);

    let permissions: string[] = getPermissionsFromToken(tokens.access);
    if (user.role === 'MODERATOR') {
      permissions = await fetchDbPermissions(tokens.access);
    }

    setAuthState({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      permissions,
    });

    return { role: user.role };
  };

  // ─── loginWithTokens() ────────────────────────────────────────────────────
  // Used by AdminAuth after admin-specific login endpoint.
  // Made async so callers can await full permissions load before navigating.
  const loginWithTokens = async (
    user: import('../types/auth.types').User,
    tokens: import('../types/auth.types').AuthTokens
  ): Promise<void> => {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));

    let permissions: string[] = [];
    if (user.role === 'MODERATOR') {
      permissions = await fetchDbPermissions(tokens.access);
    }

    setAuthState({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      permissions,
    });
  };

  // ─── logout() ─────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {}

    try {
      googleLogout();
    } catch {}

    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    setAuthState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
    });
  };

  // ─── register() ───────────────────────────────────────────────────────────
  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<void> => {
    const { user, tokens } = await authService.register({
      email,
      password,
      password_confirm: password,
      first_name: firstName,
      last_name: lastName,
    });
    const permissions = getPermissionsFromToken(tokens.access);
    setAuthState({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      permissions,
    });
  };

  // ─── refreshUser() ────────────────────────────────────────────────────────
  // CRITICAL: must NOT call readStoredPermissions() / getPermissionsFromToken()
  // for MODERATORs — the JWT has no permissions claim so it always returns [].
  // Always fetch from DB instead.
  const refreshUser = useCallback(async (): Promise<void> => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      if (!authService.isAuthenticated()) return;

      const user = await authService.getCurrentUser();
      const accessToken = getStoredAccessToken();

      let permissions: string[] = [];
      if (user.role === 'MODERATOR' && accessToken) {
        // DB is the source of truth — never the JWT
        permissions = await fetchDbPermissions(accessToken);
      } else if (user.role !== 'MODERATOR') {
        // For non-moderators keep existing permissions from token
        permissions = getPermissionsFromToken(accessToken);
      }

      setAuthState((prev) => ({
        ...prev,
        user,
        // Guard: never wipe a MODERATOR's loaded permissions with []
        permissions:
          prev.user?.role === 'MODERATOR' && permissions.length === 0
            ? prev.permissions
            : permissions,
      }));
    } catch (error) {
      console.error('[refreshUser] Failed:', error);
    } finally {
      refreshInFlight.current = false;
    }
  }, []);

  // ─── Storage event listener ───────────────────────────────────────────────
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'email_verification_updated') {
        refreshUser();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser]);

  // ─── Context value ────────────────────────────────────────────────────────
  const value: AuthContextType = {
    ...authState,
    login,
    loginWithGoogle,
    loginWithTokens,
    logout,
    register,
    refreshUser,
    hasPermission: (code: string) => {
      const { user, permissions } = authState;
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      return permissions.includes(code);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};