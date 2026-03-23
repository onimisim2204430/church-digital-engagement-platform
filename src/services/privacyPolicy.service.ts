import apiService from './api.service';

export interface PrivacyPolicyData {
  id: number;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

class PrivacyPolicyService {
  async getPublic(): Promise<PrivacyPolicyData> {
    return apiService.get('public/privacy-policy/');
  }

  async getAdmin(): Promise<PrivacyPolicyData> {
    return apiService.get('admin/content/privacy-policy/');
  }

  async updateAdmin(data: Partial<Pick<PrivacyPolicyData, 'title' | 'content' | 'is_published'>>): Promise<PrivacyPolicyData> {
    return apiService.patch('admin/content/privacy-policy/', data);
  }
}

export const privacyPolicyService = new PrivacyPolicyService();
export default privacyPolicyService;
