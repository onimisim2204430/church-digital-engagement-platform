/**
 * Register Page
 * 
 * User registration form.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../auth/AuthContext';
import '../styles/Auth.css';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const navigateByRole = (role?: string) => {
    if (role === 'ADMIN') {
      navigate('/admin');
      return;
    }
    navigate('/member');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    console.info('[GOOGLE_AUTH_DEBUG] STAGE 1: Google popup returned success callback (register)', {
      hasCredential: Boolean(credentialResponse?.credential),
      credentialLength: credentialResponse?.credential?.length || 0,
      clientIdConfigured: Boolean((process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim()),
    });

    setError('');
    setIsLoading(true);

    try {
      if (!credentialResponse.credential) {
        console.error('[GOOGLE_AUTH_DEBUG] STAGE 2 FAILED: no credential from Google callback (register)');
        setError('Google sign-up did not return a credential token.');
        return;
      }

      console.info('[GOOGLE_AUTH_DEBUG] STAGE 2: credential received, exchanging with backend (register)');
      const result = await loginWithGoogle(credentialResponse.credential);
      console.info('[GOOGLE_AUTH_DEBUG] STAGE 5: auth state updated, navigating user (register)', {
        role: result?.role,
      });
      navigateByRole(result?.role);
    } catch (err: any) {
      console.error('[GOOGLE_AUTH_DEBUG] STAGE 5 FAILED: UI received Google auth error (register)', {
        httpStatus: err?.response?.status,
        backendCode: err?.response?.data?.code,
        backendError: err?.response?.data?.error,
        message: err?.message,
      });
      setError(err?.response?.data?.error || 'Google sign-up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('[GOOGLE_AUTH_DEBUG] STAGE 1 FAILED: Google widget onError callback fired (register)');
    setError('Google sign-up failed. Please try again.');
  };

  const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.email, formData.password, formData.firstName, formData.lastName);
      navigate('/member');
    } catch (err: any) {
      const errors = err.response?.data;
      if (errors) {
        const errorMessages = Object.entries(errors)
          .map(([key, value]: [string, any]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('. ');
        setError(errorMessages);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-register-compact">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join our community</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {googleClientId && (
          <div className="auth-google-block" aria-label="Google sign up">
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
          <div className="auth-register-grid">
            <div className="form-group form-group-floating">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder=" "
                disabled={isLoading}
              />
            </div>

            <div className="form-group form-group-floating">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder=" "
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group form-group-floating">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder=" "
              disabled={isLoading}
            />
          </div>

          <div className="auth-register-grid">
            <div className="form-group form-group-floating">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder=" "
                disabled={isLoading}
              />
            </div>

            <div className="form-group form-group-floating">
              <label htmlFor="passwordConfirm">Confirm Password *</label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                required
                placeholder=" "
                disabled={isLoading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p>
            <Link to="/">Return to homepage</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
