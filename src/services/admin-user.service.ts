/**
 * Admin User Management Service
 * API calls for managing users, roles, and permissions
 */

import { apiService } from './api.service';
import { User, UserRole } from '../types/auth.types';

class AdminUserService {
  /**
   * Get all users with optional filters
   */
  async getUsers(params?: {
    role?: UserRole;
    is_active?: boolean;
    search?: string;
  }): Promise<User[]> {
    const response = await apiService.get('/admin/users/', { params });
    return response;
  }

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<User> {
    return await apiService.get(`/admin/users/${id}/`);
  }

  /**
   * Change user role
   */
  async changeRole(userId: string, role: UserRole): Promise<User> {
    return await apiService.patch(`/admin/users/${userId}/change_role/`, { role });
  }

  /**
   * Suspend a user account
   */
  async suspendUser(userId: string): Promise<User> {
    return await apiService.patch(`/admin/users/${userId}/suspend/`);
  }

  /**
   * Reactivate a suspended user
   */
  async reactivateUser(userId: string): Promise<User> {
    return await apiService.patch(`/admin/users/${userId}/reactivate/`);
  }
}

export const adminUserService = new AdminUserService();
