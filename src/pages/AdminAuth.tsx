import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { adminAuthService } from '../services/auth.service';
import '../styles/AdminAuth.css';

interface AdminAuthFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AdminAuth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<AdminAuthFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: contextLogin, loginWithTokens } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      
      if (isLogin) {
        // Login via admin endpoint
        response = await adminAuthService.login(formData.email, formData.password);
      } else {
        // Register via admin endpoint
        response = await adminAuthService.register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || '',
          lastName: formData.lastName || '',
        });
      }

      console.log('%c[AdminAuth] LOGIN SUCCESS', 'color:green;font-weight:bold', {
        email: response.user.email,
        role: response.user.role,
        tokens_present: !!(response.tokens.access && response.tokens.refresh),
      });

      // Store tokens
      localStorage.setItem('access_token', response.tokens.access);
      localStorage.setItem('refresh_token', response.tokens.refresh);
      localStorage.setItem('auth_tokens', JSON.stringify(response.tokens));
      localStorage.setItem('user', JSON.stringify(response.user));

      console.log('%c[AdminAuth] Calling loginWithTokens (ASYNC — awaiting permissions)...', 'color:orange');
      await loginWithTokens(response.user, response.tokens);
      console.log('%c[AdminAuth] loginWithTokens DONE — doing hard redirect', 'color:green;font-weight:bold');

      // Hard redirect — forces React to fully remount so AdminAccessGate
      // always reads the completed auth state, never a mid-flight empty state.
      window.location.href = '/admin';
    } catch (err: any) {
      console.error('Admin auth error:', err);
      setError(err.message || (isLogin ? 'Login failed. Please try again.' : 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="admin-auth-container">
      <div className="admin-auth-box">
        <div className="admin-auth-header">
          <h1>Church Admin Portal</h1>
          <p>{isLogin ? 'Sign in to manage your church platform' : 'Create your admin account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-auth-form">
          {error && (
            <div className="error-message">
              <i className="error-icon">⚠️</i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@church.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              minLength={8}
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="John"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Doe"
                  disabled={loading}
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Admin Account')}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            {isLogin ? "Don't have an admin account?" : 'Already have an admin account?'}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ email: '', password: '', firstName: '', lastName: '' });
              }}
              disabled={loading}
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </p>
        </div>

        <div className="auth-info">
          <p className="info-text">
            🔒 Admin access only. First registration creates the primary admin account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;