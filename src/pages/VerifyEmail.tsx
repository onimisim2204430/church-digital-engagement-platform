/**
 * Email Verification Page
 * 
 * Handles email verification via token from email link.
 * Route: /verify-email?token=TOKEN
 * 
 * Features:
 * - Displays loading state during verification
 * - Handles multiple error scenarios (expired, invalid, already verified)
 * - Auto-redirects on success
 * - Provides action buttons for different scenarios
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import authService from '../services/auth.service';
import { useToast } from '../contexts/ToastContext';
import emailVerificationService from '../services/emailVerification.service';
import './VerifyEmail.css';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'not-authenticated';
type ErrorCode = 'no-token' | 'expired' | 'invalid' | 'already-verified' | 'unknown' | 'not-authenticated';

interface VerificationErrorData {
  code: ErrorCode;
  message: string;
  suggestion: string;
}

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorData, setErrorData] = useState<VerificationErrorData | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const hasVerifiedRef = useRef(false);
  const MIN_VERIFY_MS = 3000;

  // Handle auto-redirect on success
  useEffect(() => {
    if (status === 'success' && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (status === 'success' && redirectCountdown === 0) {
      // Navigate to settings or dashboard
      if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
        navigate('/admin');
      } else if (user) {
        navigate('/member/settings');
      } else {
        navigate('/');
      }
    }
    return;
  }, [status, redirectCountdown, user, navigate]);

  // Parse error code from response
  const parseErrorCode = (error: any): ErrorCode => {
    const code = error.code || error.response?.data?.code;
    if (code === 'token_expired' || code === 'EXPIRED_TOKEN') return 'expired';
    if (code === 'invalid_token' || code === 'INVALID_TOKEN') return 'invalid';
    if (code === 'already_verified' || code === 'ALREADY_VERIFIED') return 'already-verified';
    return 'unknown';
  };

  // Get user-friendly error message and suggestions
  const getErrorData = (error: any, errorCode: ErrorCode): VerificationErrorData => {
    const baseMessage = error.message || 'Verification failed';

    switch (errorCode) {
      case 'no-token':
        return {
          code: 'no-token',
          message: 'No verification token provided',
          suggestion: 'The verification link is missing the required token. Please request a new verification email.',
        };
      case 'expired':
        return {
          code: 'expired',
          message: 'Verification link has expired',
          suggestion: 'Verification links are valid for 30 minutes. Please request a new verification email from your settings.',
        };
      case 'invalid':
        return {
          code: 'invalid',
          message: 'Invalid verification link',
          suggestion: 'This link is invalid or has already been used. Please request a new verification email.',
        };
      case 'already-verified':
        return {
          code: 'already-verified',
          message: 'Email already verified',
          suggestion: 'Your email address has already been verified. You can now access all features.',
        };
      default:
        return {
          code: 'unknown',
          message: baseMessage,
          suggestion: 'An unexpected error occurred. Please try again or contact support.',
        };
    }
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (hasVerifiedRef.current) {
        return;
      }
      hasVerifiedRef.current = true;

      const startTime = Date.now();
      const waitForMinimum = async () => {
        const elapsed = Date.now() - startTime;
        const remaining = MIN_VERIFY_MS - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
      };

      // Parse token from URL
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      console.log('[DEBUG] VERIFY EMAIL PAGE - Token from URL:', token?.substring(0, 10) + '...');

      if (!token) {
        console.error('[ERROR] No token in URL');
        setStatus('error');
        setErrorData(getErrorData(new Error('No token'), 'no-token'));
        return;
      }

      try {
        console.log('[DEBUG] Calling verification service with token...');
        
        // PUBLIC VERIFICATION - No authentication required
        const result = await emailVerificationService.verifyEmail(token);
        
        console.log('[DEBUG] Verification result:', result);

        await waitForMinimum();
        
        setStatus('success');
        setVerifiedEmail(result.email || '');
        showSuccess(result.message || 'Email verified successfully! Redirecting...');
        
        localStorage.setItem('email_verification_updated', Date.now().toString());

        // Refresh user data to update email_verified status if authenticated
        try {
          await refreshUser();
          console.log('[DEBUG] User data refreshed');
        } catch (refreshError) {
          console.warn('[WARN] Failed to refresh user data:', refreshError);
        }
        
      } catch (error: any) {
        console.error('[ERROR] Verification failed:', error);

        const errorCode = parseErrorCode(error);

        // If backend says already verified, treat as success.
        if (errorCode === 'already-verified') {
          await waitForMinimum();
          setStatus('success');
          setVerifiedEmail(user?.email || '');
          showSuccess('Your email is already verified. Redirecting...');
          return;
        }

        // If authenticated, check final user state and use that as source of truth.
        if (authService.isAuthenticated()) {
          try {
            const currentUser = await authService.getCurrentUser();
            if (currentUser.emailVerified) {
              await waitForMinimum();
              setStatus('success');
              setVerifiedEmail(currentUser.email || '');
              showSuccess('Email verified successfully! Redirecting...');
              return;
            }
          } catch (statusError) {
            console.warn('[WARN] Failed to check current user status:', statusError);
          }
        }

        await waitForMinimum();
        setStatus('error');
        const data = getErrorData(error, errorCode);
        setErrorData(data);
        showError(data.message);
      }
    };

    verifyToken();
  }, [location.search, user, refreshUser, showSuccess, showError]);

  const handleContinue = () => {
    if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
      navigate('/admin');
    } else if (user) {
      navigate('/member');
    } else {
      navigate('/');
    }
  };

  const handleGoToSettings = () => {
    navigate('/member/settings');
  };

  const handleRequestNewLink = () => {
    navigate('/member/settings?action=verify-email');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-container">
        <div className="verify-email-card">
          {/* Loading State */}
          {status === 'verifying' && (
            <div className="verify-state verifying">
              <div className="status-icon loading">
                <div className="spinner"></div>
              </div>
              <h1>Verifying Your Email</h1>
              <p>Please wait while we verify your email address...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="verify-state success">
              <div className="status-icon success-icon">
                <span>✓</span>
              </div>
              <h1>Email Verified Successfully!</h1>
              <p className="verified-email">{verifiedEmail}</p>
              <p className="success-message">
                Your email address has been successfully verified. You can now access all features.
              </p>
              
              <div className="redirect-info">
                <p>Redirecting to dashboard in {redirectCountdown} seconds...</p>
              </div>
              
              <div className="action-buttons">
                <button onClick={handleGoToSettings} className="btn-primary">
                  Go to Settings Now
                </button>
                <button onClick={handleContinue} className="btn-secondary">
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && errorData && (
            <div className="verify-state error">
              <div className="status-icon error-icon">
                <span>✕</span>
              </div>
              <h1>{errorData.message}</h1>
              <p className="error-suggestion">{errorData.suggestion}</p>
              
              {/* Error-specific help */}
              <div className="error-details">
                {errorData.code === 'expired' && (
                  <div className="help-box">
                    <h3>⏱️ Link Expired</h3>
                    <p>Verification links are valid for 30 minutes for security reasons.</p>
                  </div>
                )}
                
                {errorData.code === 'invalid' && (
                  <div className="help-box">
                    <h3>⚠️ Invalid Link</h3>
                    <p>This link is invalid or has already been used.</p>
                  </div>
                )}
                
                {errorData.code === 'already-verified' && (
                  <div className="help-box">
                    <h3>✓ Already Verified</h3>
                    <p>Your email address is already verified. No further action is required.</p>
                  </div>
                )}
                
                {errorData.code === 'no-token' && (
                  <div className="help-box">
                    <h3>🔗 Missing Token</h3>
                    <p>The verification link appears to be incomplete or malformed.</p>
                  </div>
                )}
              </div>
              
              <div className="action-buttons">
                {errorData.code !== 'already-verified' && (
                  <button onClick={handleRequestNewLink} className="btn-primary">
                    Request New Verification Link
                  </button>
                )}
                <button onClick={handleGoToSettings} className="btn-secondary">
                  Go to Settings
                </button>
                <button onClick={handleBackToHome} className="btn-outline">
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
