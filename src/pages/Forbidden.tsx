/**
 * 403 Forbidden Page
 * Shown when user attempts to access admin features without proper permissions
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import '../styles/ErrorPages.css';

const Forbidden: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="error-page">
      <div className="error-container">
        <div className="error-code">403</div>
        <h1 className="error-title">Access Forbidden</h1>
        <p className="error-message">
          {user?.role === 'MEMBER' 
            ? "You don't have permission to access this area. Admin privileges are required."
            : "You don't have permission to access this resource."}
        </p>
        
        <div className="error-actions">
          <button 
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go to Home
          </button>
          <button 
            onClick={() => navigate('/content')}
            className="btn-secondary"
          >
            Browse Content
          </button>
        </div>

        <div className="error-help">
          <p>If you believe this is an error, please contact your administrator.</p>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
