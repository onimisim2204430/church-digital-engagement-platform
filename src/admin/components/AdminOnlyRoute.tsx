/**
 * Admin-Only Route Wrapper
 * Shows access denied message if user is not an ADMIN
 */

import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import { Card } from '../components/Card';

interface AdminOnlyRouteProps {
  children: React.ReactNode;
}

const AdminOnlyRoute: React.FC<AdminOnlyRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="access-denied-pro">
        <Card>
          <div className="denied-content">
            <div className="denied-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>Access Denied</h3>
            <p>This section is only accessible to administrators.</p>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminOnlyRoute;
