/**
 * Email Verification API Service
 * 
 * Handles all email verification related API calls.
 */

import { AxiosResponse } from 'axios';
import api from './api.service';

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  expires_in_minutes?: number;
  verified_at?: string;
  email?: string;
  code?: string;
}

export interface RateLimitError {
  error: string;
  retry_after_seconds?: number;
}

class EmailVerificationService {
  /**
   * Initiate email verification process
   * Sends a verification email to the authenticated user
   */
  async initiateVerification(): Promise<EmailVerificationResponse> {
    try {
      console.log('[DEBUG] SENDING REQUEST TO:', '/auth/verify-email/initiate/');
      
      const response: AxiosResponse<any> = await api.post(
        '/auth/verify-email/initiate/'
      );
      
      // CRITICAL DEBUG - Log everything about the response
      console.log('\n[DEBUG] ===== RESPONSE STRUCTURE DIAGNOSIS =====');
      console.log('[DEBUG] RESPONSE STATUS:', response.status);
      console.log('[DEBUG] RAW RESPONSE DATA:', response.data);
      console.log('[DEBUG] RESPONSE DATA TYPE:', typeof response.data);
      console.log('[DEBUG] IS OBJECT:', typeof response.data === 'object');
      console.log('[DEBUG] IS STRING:', typeof response.data === 'string');
      console.log('[DEBUG] IS NULL:', response.data === null);
      console.log('[DEBUG] IS UNDEFINED:', response.data === undefined);
      
      if (typeof response.data === 'object' && response.data !== null) {
        console.log('[DEBUG] RESPONSE DATA KEYS:', Object.keys(response.data));
        console.log('[DEBUG] RESPONSE DATA (full JSON):', JSON.stringify(response.data, null, 2));
      }
      console.log('[DEBUG] ==========================================\n');
      
      // UNIVERSAL RESPONSE PARSER - Handles ANY format
      let message = '';
      let success = true;
      let expiresIn = 30;
      
      if (response.data === null || response.data === undefined) {
        // Empty response
        message = 'Verification email sent';
      }
      else if (typeof response.data === 'string') {
        // Service returned a plain string
        console.log('[DEBUG] Response is STRING:', response.data);
        message = response.data;
      }
      else if (typeof response.data === 'object') {
        // Service returned an object - try multiple paths
        console.log('[DEBUG] Response is OBJECT, extracting fields...');
        message = response.data.message || 
                  response.data.detail || 
                  response.data.data?.message ||
                  (response.data.success && typeof response.data.success === 'object' ? response.data.success.message : '') ||
                  'Verification email sent';
        
        success = response.data.success !== undefined ? Boolean(response.data.success) : true;
        expiresIn = response.data.expires_in_minutes || 
                    response.data.expiresIn || 
                    response.data.data?.expires_in_minutes ||
                    30;
        
        console.log('[DEBUG] EXTRACTED - message:', message, ', success:', success, ', expiresIn:', expiresIn);
      }
      else {
        // Unknown format - fallback
        console.log('[DEBUG] Response is UNKNOWN TYPE:', typeof response.data);
        message = 'Verification email sent';
      }
      
      const result = {
        success,
        message,
        expires_in_minutes: expiresIn
      };
      
      console.log('[DEBUG] FINAL RESULT BEING RETURNED:', result);
      return result;
      
    } catch (error: any) {
      // LOG THE COMPLETE ERROR OBJECT FOR DEBUGGING
      console.log('========== ERROR RESPONSE ==========');
      console.log('Status:', error.response?.status);
      console.log('Status Text:', error.response?.statusText);
      console.log('Data:', error.response?.data);
      console.log('Headers:', error.response?.headers);
      console.log('Config URL:', error.config?.url);
      console.log('Message:', error.message);
      console.log('====================================');
      
      // Extract error message from any possible error structure
      let errorMessage = 'Failed to send verification email';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('[DEBUG] EXTRACTED ERROR MESSAGE:', errorMessage);
      
      // Create a new error with the actual message
      const enhancedError: any = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.status = error.response?.status;
      throw enhancedError;
    }
  }

  /**
   * Resend verification email
   * Rate-limited to prevent abuse
   */
  async resendVerification(): Promise<EmailVerificationResponse> {
    const response: AxiosResponse<EmailVerificationResponse> = await api.post(
      '/auth/verify-email/resend/'
    );
    return response.data;
  }

  /**
   * Verify email with token from email link
   * PUBLIC ENDPOINT - No authentication required
   * Token is sent as query parameter
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    try {
      console.log('[DEBUG] VERIFYING EMAIL TOKEN:', token.substring(0, 10) + '...');
      
      // PUBLIC GET endpoint - token in query params
      const response: AxiosResponse<any> = await api.get(
        `/auth/verify-email/?token=${encodeURIComponent(token)}`
      );
      
      console.log('[DEBUG] VERIFICATION RESPONSE:', response.data);
      
      return {
        success: response.data.success !== false,
        message: response.data.message || 'Email verified successfully',
        email: response.data.email,
        verified_at: response.data.verified_at
      };
    } catch (error: any) {
      console.error('[ERROR] VERIFICATION FAILED:', {
        status: error.response?.status,
        data: error.response?.data,
        code: error.response?.data?.code
      });
      
      // Extract error details
      const errorData = error.response?.data || {};
      const enhancedError: any = new Error(errorData.message || 'Verification failed');
      enhancedError.response = error.response;
      enhancedError.code = errorData.code;
      throw enhancedError;
    }
  }
}

const emailVerificationService = new EmailVerificationService();

export default emailVerificationService;
