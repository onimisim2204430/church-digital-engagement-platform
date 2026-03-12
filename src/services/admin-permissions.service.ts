/**
 * Admin Permissions Service
 * API calls for managing moderator module permissions.
 */

import { apiService } from './api.service';

export interface PermissionCodeMeta {
  code: string;
  label: string;
  description: string;
  icon: string;
}

export interface PermissionCodesResponse {
  codes: Record<string, PermissionCodeMeta[]>;
  templates: Record<string, {
    label: string;
    description: string;
    color: string;
    icon: string;
    codes: string[];
    user_count: number;
  }>;
}

export interface ModeratorPermissionData {
  user_id: string;
  email: string;
  role: string;
  permissions: string[];
  sub_role_label: string;
  updated_at: string | null;
}

class AdminPermissionsService {
  /** Fetch all permission codes grouped by category, plus sub-role templates. */
  async getPermissionCodes(): Promise<PermissionCodesResponse> {
    return apiService.get('/admin/permissions/codes/');
  }

  /** Get current permissions for a moderator user. */
  async getModeratorPermissions(userId: string): Promise<ModeratorPermissionData> {
    return apiService.get(`/admin/users/${userId}/permissions/`);
  }

  /** Update permissions for a moderator user. */
  async updateModeratorPermissions(
    userId: string,
    permissions: string[],
    subRoleLabel?: string
  ): Promise<ModeratorPermissionData> {
    return apiService.patch(`/admin/users/${userId}/permissions/`, {
      permissions,
      sub_role_label: subRoleLabel ?? '',
    });
  }
}

export const adminPermissionsService = new AdminPermissionsService();
