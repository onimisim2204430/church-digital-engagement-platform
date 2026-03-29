/**
 * Login Page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../auth/AuthContext';
import '../styles/Auth.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const navigateByRole = (role?: string) => {
    if (role === 'ADMIN') {
      navigate('/admin');
      return;
    }
    if (role === 'MODERATOR') {
      navigate('/member');
      return;
    }
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      navigateByRole(result?.role);
    } catch (err: any) {
      setError(err.response?.data?.non_field_errors?.[0] || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    console.info('[GOOGLE_AUTH_DEBUG] STAGE 1: Google popup returned success callback', {
      hasCredential: Boolean(credentialResponse?.credential),
      credentialLength: credentialResponse?.credential?.length || 0,
      clientIdConfigured: Boolean((process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim()),
    });

    setError('');
    setIsLoading(true);

    try {
      if (!credentialResponse.credential) {
        console.error('[GOOGLE_AUTH_DEBUG] STAGE 2 FAILED: no credential from Google callback');
        setError('Google sign-in did not return a credential token.');
        return;
      }

      console.info('[GOOGLE_AUTH_DEBUG] STAGE 2: credential received, exchanging with backend');
      const result = await loginWithGoogle(credentialResponse.credential);
      console.info('[GOOGLE_AUTH_DEBUG] STAGE 5: auth state updated, navigating user', {
        role: result?.role,
      });
      navigateByRole(result?.role);
    } catch (err: any) {
      console.error('[GOOGLE_AUTH_DEBUG] STAGE 5 FAILED: UI received Google auth error', {
        httpStatus: err?.response?.status,
        backendCode: err?.response?.data?.code,
        backendError: err?.response?.data?.error,
        message: err?.message,
      });
      setError(err?.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('[GOOGLE_AUTH_DEBUG] STAGE 1 FAILED: Google widget onError callback fired');
    setError('Google sign-in failed. Please try again.');
  };

  const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-register-compact">
        <div className="auth-header">
          <h1>Sign In</h1>
          <p>Access your account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {googleClientId && (
          <div className="auth-google-block" aria-label="Google sign in">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              shape="circle"
              size="large"
            />
          </div>
        )}

        {googleClientId && (
          <div className="auth-divider" role="separator" aria-label="or">
            <span>or</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form auth-form-register-compact">
          <div className="form-group form-group-floating">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=" "
              disabled={isLoading}
            />
          </div>

          <div className="form-group form-group-floating form-group-login-password">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=" "
              disabled={isLoading}
            />
            <div className="auth-forgot-row">
              <Link to="/forgot-password" className="auth-forgot-link">Forgot your password?</Link>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Create one</Link></p>
          <p><Link to="/">Return to homepage</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;