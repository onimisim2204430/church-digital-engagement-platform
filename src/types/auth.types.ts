/**
 * Type definitions for User and Authentication
 */

export enum UserRole {
  VISITOR = 'VISITOR',
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  dateJoined: string;
  phone?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
  profilePicture?: string;
  bio?: string;
  lastLogin?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Module-level permission codes extracted from the JWT payload. */
  permissions: string[];
}

/** Decoded JWT access token payload (our custom fields). */
export interface JwtPayload {
  user_id: string;
  role?: string;
  permissions?: string[];
  exp?: number;
  iat?: number;
  token_type?: string;
}
