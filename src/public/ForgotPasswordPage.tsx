/**
 * Forgot Password Page
 *
 * Single-page, two-step password reset flow:
 *   Step 1 — User enters their email; a 6-digit code is sent.
 *   Step 2 — User enters the code + a new password to complete the reset.
 *
 * On success the user is redirected to /login with a toast-like banner.
 */

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import '../styles/Auth.css';
import '../styles/ForgotPassword.css';

type Step = 'request' | 'confirm' | 'success';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // ── Shared state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('request');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Step 1 — email ────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');

  // ── Step 2 — code + password ──────────────────────────────────────────────
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1 submit ─────────────────────────────────────────────────────────
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setStep('confirm');
      startCooldown(60);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend code ───────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      startCooldown(60);
      setCode('');
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Could not resend code. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2 submit ─────────────────────────────────────────────────────────
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.confirmPasswordReset(email, code, newPassword, confirmPassword);
      setStep('success');
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Could not reset password. Please check your code and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║  RENDER                                                                ║
  // ╚════════════════════════════════════════════════════════════════════════╝

  // ── Success screen ────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="auth-container">
        <div className="auth-card fp-card">
          <div className="fp-success-icon">✓</div>
          <div className="auth-header">
            <h1>Password Reset!</h1>
            <p>Your password has been updated successfully.</p>
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: '8px' }}
            onClick={() => navigate('/login')}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card fp-card">

        {/* ── Step indicator ─────────────────────────────────────────────── */}
        <div className="fp-step-indicator">
          <div className={`fp-step ${step === 'request' ? 'fp-step--active' : 'fp-step--done'}`}>
            <span className="fp-step__num">{step !== 'request' ? '✓' : '1'}</span>
            <span className="fp-step__label">Email</span>
          </div>
          <div className="fp-step__connector" />
          <div className={`fp-step ${step === 'confirm' ? 'fp-step--active' : ''}`}>
            <span className="fp-step__num">2</span>
            <span className="fp-step__label">Reset</span>
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────────────────────── */}
        {error && <div className="error-message">{error}</div>}

        {/* ══════════════ STEP 1 ════════════════════════════════════════════ */}
        {step === 'request' && (
          <>
            <div className="auth-header">
              <h1>Forgot Password?</h1>
              <p>Enter your email and we'll send you a 6-digit reset code.</p>
            </div>

            <form onSubmit={handleRequestCode} className="auth-form">
              <div className="form-group">
                <label htmlFor="fp-email">Email Address</label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Sending Code…' : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {/* ══════════════ STEP 2 ════════════════════════════════════════════ */}
        {step === 'confirm' && (
          <>
            <div className="auth-header">
              <h1>Enter Your Code</h1>
              <p>
                We sent a 6-digit code to <strong>{email}</strong>.
                Enter it below along with your new password.
              </p>
            </div>

            <form onSubmit={handleConfirmReset} className="auth-form">
              {/* Code input */}
              <div className="form-group">
                <label htmlFor="fp-code">6-Digit Code</label>
                <input
                  id="fp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  disabled={isLoading}
                  autoFocus
                  className="fp-code-input"
                />
              </div>

              {/* New password */}
              <div className="form-group">
                <label htmlFor="fp-password">New Password</label>
                <div className="fp-password-wrapper">
                  <input
                    id="fp-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    disabled={isLoading}
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="fp-toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label htmlFor="fp-confirm">Confirm New Password</label>
                <input
                  id="fp-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  disabled={isLoading}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            {/* Resend link */}
            <div className="auth-footer">
              <p>
                Didn't receive it?{' '}
                {resendCooldown > 0 ? (
                  <span className="fp-resend-wait">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    className="fp-link-btn"
                    onClick={handleResend}
                    disabled={isLoading}
                  >
                    Resend code
                  </button>
                )}
              </p>
              <p>
                <button
                  type="button"
                  className="fp-link-btn"
                  onClick={() => { setStep('request'); setError(''); setCode(''); }}
                >
                  ← Change email address
                </button>
              </p>
            </div>
          </>
        )}

        {/* ── Back to login ──────────────────────────────────────────────── */}
        <div className="auth-footer" style={{ marginTop: step === 'confirm' ? '0' : '24px' }}>
          <p>
            <Link to="/login">← Back to Sign In</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default ForgotPasswordPage;
