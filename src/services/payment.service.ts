import apiService from './api.service';

export interface InitializePaymentRequest {
  email: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
  callback_url?: string;
}

export interface InitializePaymentResponse {
  status: 'success' | 'error';
  reference: string;
  authorization_url: string;
  access_code: string;
  payment_status: string;
  public_key?: string;
  message?: string;
}

export interface VerifyPaymentResponse {
  status: 'success' | 'error';
  reference: string;
  payment_status: string;
  paid_at?: string | null;
  message?: string;
}

export interface MemberPaymentTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  status_label: string;
  payment_method?: string | null;
  amount_verified: boolean;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, any>;
}

export interface MemberPaymentTransactionsResponse {
  status: 'success' | 'error';
  count: number;
  results: MemberPaymentTransaction[];
  message?: string;
}

class PaymentService {
  async initializePayment(payload: InitializePaymentRequest): Promise<InitializePaymentResponse> {
    return apiService.post<InitializePaymentResponse>('/payments/initialize/', payload);
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    return apiService.get<VerifyPaymentResponse>(`/payments/verify/${reference}/`);
  }

  async getMyTransactions(statusFilter?: string): Promise<MemberPaymentTransactionsResponse> {
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    return apiService.get<MemberPaymentTransactionsResponse>(`/payments/my-transactions/${query}`);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
