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

export interface MemberRecurringPlan {
  id: string;
  email: string;
  giving_item_id?: string | null;
  giving_title: string;
  amount: number;
  currency: string;
  frequency: string;
  frequency_label: string;
  status: string;
  status_label: string;
  next_payment_at?: string | null;
  last_payment_at?: string | null;
  started_at?: string | null;
  paused_at?: string | null;
  cancelled_at?: string | null;
  paystack_plan_code?: string | null;
  paystack_subscription_code?: string | null;
  inferred_from_metadata: boolean;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  metadata?: Record<string, any>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MemberRecurringPlansResponse {
  status: 'success' | 'error';
  count: number;
  summary?: {
    active: number;
    paused: number;
    cancelled: number;
  };
  results: MemberRecurringPlan[];
  message?: string;
}

export interface MemberRecurringPlanDetailResponse {
  status: 'success' | 'error';
  plan: MemberRecurringPlan;
  history_count: number;
  history: MemberPaymentTransaction[];
  message?: string;
}

class PaymentService {
  async initializePayment(payload: InitializePaymentRequest): Promise<InitializePaymentResponse> {
    return apiService.post<InitializePaymentResponse>('payments/initialize/', payload);
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    return apiService.get<VerifyPaymentResponse>(`payments/verify/${reference}/`);
  }

  async getMyTransactions(statusFilter?: string): Promise<MemberPaymentTransactionsResponse> {
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    return apiService.get<MemberPaymentTransactionsResponse>(`payments/my-transactions/${query}`);
  }

  async getMyRecurringPlans(statusFilter?: string): Promise<MemberRecurringPlansResponse> {
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    return apiService.get<MemberRecurringPlansResponse>(`payments/my-recurring-plans/${query}`);
  }

  async getMyRecurringPlan(planId: string): Promise<MemberRecurringPlanDetailResponse> {
    return apiService.get<MemberRecurringPlanDetailResponse>(`payments/my-recurring-plans/${planId}/`);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
