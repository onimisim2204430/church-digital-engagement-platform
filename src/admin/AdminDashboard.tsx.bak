/**
 * Admin Dashboard - Dashboard Overview Page
 * Main dashboard view with stats and quick actions
 */

import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../types/auth.types';
import DashboardOverview from './DashboardOverview';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  return <DashboardOverview userRole={user?.role || UserRole.MEMBER} />;
};

export default AdminDashboard;
