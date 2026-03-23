/**
 * Contact Service — API client for public contact form submissions
 * and admin contact inbox management.
 */
import apiService from './api.service';

export type ContactCategory =
  | 'GENERAL'
  | 'SUPPORT'
  | 'PRAYER'
  | 'TECHNICAL'
  | 'FINANCE'
  | 'PARTNERSHIP';

export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'REPLIED' | 'CLOSED';

export interface ContactSubmitPayload {
  sender_name: string;
  sender_email: string;
  sender_phone?: string;
  category: ContactCategory;
  subject: string;
  message: string;
  preferred_contact?: 'email' | 'phone';
  consent: boolean;
}

export interface ContactMessageSummary {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  category: ContactCategory;
  subject: string;
  status: ContactStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  reply_count: number;
  created_at: string;
  updated_at: string;
  replied_at: string | null;
}

export interface ContactReply {
  id: string;
  reply_text: string;
  replied_by: string | null;
  replied_by_name: string;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
}

export interface ContactMessageDetail extends ContactMessageSummary {
  message: string;
  preferred_contact: string;
  consent: boolean;
  user_id: string | null;
  admin_notes: string;
  notification_sent: boolean;
  admin_email_sent: boolean;
  replies: ContactReply[];
}

export interface ContactInboxResponse {
  count: number;
  results: ContactMessageSummary[];
  next: string | null;
  previous: string | null;
}

export interface ContactStats {
  status: 'success';
  by_status: Record<ContactStatus, number>;
  by_category: Record<ContactCategory, number>;
  total: number;
}

export const CONTACT_CATEGORIES: { value: ContactCategory; label: string }[] = [
  { value: 'GENERAL', label: 'General Enquiry' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'PRAYER', label: 'Prayer Request' },
  { value: 'TECHNICAL', label: 'Technical Issue' },
  { value: 'FINANCE', label: 'Finance / Giving' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
];

class ContactService {
  /**
   * Submit a contact message (public — no auth required).
   * Uses apiService which is always configured with the correct base URL.
   */
  async submitMessage(payload: ContactSubmitPayload): Promise<{ id: string; message: string }> {
    return apiService.post<{ id: string; message: string }>('/contact/submit/', payload);
  }

  /**
   * Admin: list contact messages with optional filters.
   */
  async getMessages(params?: {
    status?: ContactStatus;
    category?: ContactCategory;
    search?: string;
    page?: number;
  }): Promise<ContactInboxResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    return apiService.get<ContactInboxResponse>(`/contact/messages/?${query.toString()}`);
  }

  /**
   * Admin: get a single contact message with replies.
   */
  async getMessage(id: string): Promise<ContactMessageDetail> {
    return apiService.get<ContactMessageDetail>(`/contact/messages/${id}/`);
  }

  /**
   * Admin: update status, notes, or assignee.
   */
  async updateMessage(
    id: string,
    data: Partial<{ status: ContactStatus; admin_notes: string; assigned_to: string }>
  ): Promise<ContactMessageDetail> {
    return apiService.patch<ContactMessageDetail>(`/contact/messages/${id}/`, data);
  }

  /**
   * Admin: reply to a contact message. Sends email to original sender.
   */
  async replyToMessage(id: string, reply_text: string): Promise<{ message: string; email_sent: boolean }> {
    return apiService.post(`/contact/messages/${id}/reply/`, { reply_text });
  }

  /**
   * Admin: get aggregate stats.
   */
  async getStats(): Promise<ContactStats> {
    return apiService.get<ContactStats>('/contact/stats/');
  }
}

export const contactService = new ContactService();
export default contactService;
