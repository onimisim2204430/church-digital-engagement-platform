/**
 * Main App Router
 * 
 * Defines application routing structure:
 * - Public routes (accessible to all)
 * - Member routes (requires MEMBER or ADMIN role)
 * - Admin routes (requires ADMIN or MODERATOR role)
 *   - User Management is restricted to ADMIN only at component level
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { UserRole } from '../types/auth.types';
import ToastContainer from '../components/ToastContainer';
import { useAuth } from '../auth/AuthContext';
import axios from 'axios';

// Public pages
import HomePage from '../public/HomePage';
import LibraryPage from '../public/library/LibraryPage';
import SeriesPage from '../public/library/Series/SeriesPage';
import SeriesPanel from '../public/library/Series/SeriesPanel';
import SermonDetail from '../public/library/sermon/SermonDetail';
import ConnectPage from '../public/ConnectPage';
import EventsPage from '../public/EventsPage';
import GivingPage from '../public/GivingPage';
import LoginPage from '../public/LoginPage';
import RegisterPage from '../public/RegisterPage';
import ForgotPasswordPage from '../public/ForgotPasswordPage';
import AdminAuth from '../pages/AdminAuth';
import DebugAuth from '../pages/DebugAuth';
import Forbidden from '../pages/Forbidden';
import VerifyEmail from '../pages/VerifyEmail';
import DailyWordDetailPage from '../public/DailyWordDetailPage';
import OpenBiblePage from '../public/pages/OpenBiblePage';

// Member pages
import MemberOverview from '../member/views/MemberOverview';
import MemberSermons from '../member/views/MemberSermons';
import MemberEvents from '../member/views/MemberEvents';
import MemberCommunity from '../member/views/MemberCommunity';
import MemberChat from '../member/views/MemberChat';
import MemberPrayer from '../member/views/MemberPrayer';
import MemberGiving from '../member/views/MemberGiving';
import MemberSettings from '../member/MemberSettings';
import MemberLayout from '../member/layouts/MemberLayout';

// Admin pages
import AdminDashboard from '../admin/AdminDashboard';
import AdminLanding from '../admin/AdminLanding';
import ContentManager from '../admin/ContentManager';
import SeriesManager, { SeriesCreate, SeriesEdit } from '../admin/SeriesManagement';
import UserManager from '../admin/UserManagement';
import InteractionModeration from '../admin/InteractionManagement';
import EmailCampaigns from '../admin/EmailCampaigns';
import ModerationReports from '../admin/ModerationReports';
import AdminSettings from '../admin/setting/index';
//import AppSettings from '../admin/AppSettings';
import DraftsManager from '../admin/DraftsManager';
// import DailyWordsPage from '../admin/DailyWordsPage'; // TODO: Restore if bulk daily word management needed
import WeeklyFlowPage from '../admin/WeeklyFlowManagement';
import SeedManager from '../admin/SeedManagement';
import {
  FinancialHub,
  PaymentRecords,
  FinancialReports,
  FinancialDashboard,
} from '../admin/FinancialManagement';
import ContentDashboard from '../admin/ContentManagement/dashboard/ContentDashboard';
import CommunityDashboard from '../admin/CommunityDashboard';
import { MinistryHub } from '../admin/MinistryManagement';
import GrowthDashboard from '../admin/GrowthDashboard';
import AdminPlaceholder from '../admin/AdminPlaceholder';
import AdminLayout from '../admin/layouts/AdminLayout';
import AdminOnlyRoute from '../admin/components/AdminOnlyRoute';
import PermissionGatedRoute from '../admin/components/PermissionGatedRoute';

// Placed after all imports — must not be inside any function
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

/**
 * AdminAccessGate
 *
 * For ADMIN users: always passes through immediately.
 * For MODERATOR users: ALWAYS fetches /auth/my-permissions/ directly from the
 *   database on every mount — never trusts React state, because the member
 *   login endpoint doesn't bake permissions into the JWT and refreshUser()
 *   can overwrite DB-fetched permissions with [] from the bare token.
 * Shows null (blank) while the check is in flight so there is no 403 flash.
 */
const AdminAccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, tokens } = useAuth();

  type Status = 'idle' | 'checking' | 'allowed' | 'blocked';
  const [status, setStatus] = useState<Status>('idle');
  const checkedUid = useRef<string | null>(null);

  useEffect(() => {
    // Reset when user changes
    if (!user) {
      setStatus('idle');
      checkedUid.current = null;
      return;
    }

    // ADMIN never needs a check
    if (user.role === UserRole.ADMIN) {
      setStatus('allowed');
      return;
    }

    // MODERATOR: fetch from DB. Only re-fetch if user id changed.
    if (user.role === UserRole.MODERATOR) {
      const uid = String(user.id);
      if (checkedUid.current === uid) return; // already checked this session
      checkedUid.current = uid;
      setStatus('checking');

      const token =
        tokens?.access ??
        (() => {
          try { return JSON.parse(localStorage.getItem('auth_tokens') ?? '{}').access ?? null; }
          catch { return null; }
        })() ??
        localStorage.getItem('access_token');

      axios
        .get(`${API_BASE_URL}/auth/my-permissions/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((resp) => {
          const perms: string[] = resp.data.permissions ?? [];
          console.log('[AdminAccessGate] DB perms for', user.email, ':', perms);
          setStatus(perms.length > 0 ? 'allowed' : 'blocked');
        })
        .catch((err) => {
          console.error('[AdminAccessGate] fetch failed', err?.response?.status);
          setStatus('blocked');
        });
      return;
    }

    // Any other role — block
    setStatus('blocked');
  }, [user, tokens]);

  // Still resolving auth state or DB check in flight
  if (isLoading || status === 'idle' || status === 'checking') return null;

  if (status === 'blocked') {
    console.error('[AdminAccessGate] Blocked →  /403');
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

// Admin index route - moved outside component to prevent recreating on every render
const AdminIndexRoute: React.FC = () => {
  const { user } = useAuth();
  return user?.role === UserRole.ADMIN ? <AdminDashboard /> : <AdminLanding />;
};

const AppRouter: React.FC = () => {

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/series" element={<SeriesPage />} />
        <Route path="/library/series/:slug" element={<SeriesPanel />} />
        <Route path="/library/sermon/:id" element={<SermonDetail />} />
        <Route path="/bible" element={<OpenBiblePage />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/giving" element={<GivingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* TODO: remove after auth debugging */}
        <Route path="/debug-auth" element={<DebugAuth />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/content" element={<Navigate to="/library" replace />} />
        <Route path="/content/:id" element={<Navigate to="/library" replace />} />
        <Route path="/daily-word/:date" element={<DailyWordDetailPage />} />
        
        {/* Admin Authentication (Separate from member auth) */}
        <Route path="/admin-auth" element={<AdminAuth />} />
        
        {/* Email Verification (Protected - requires authentication) */}
        <Route 
          path="/verify-email" 
          element={
            <ProtectedRoute>
              <VerifyEmail />
            </ProtectedRoute>
          } 
        />
        
        {/* Member Routes - Nested routing */}
        <Route 
          path="/member" 
          element={
            <ProtectedRoute>
              <MemberLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MemberOverview />} />
          <Route path="dashboard" element={<MemberOverview />} />
          <Route path="sermons" element={<MemberSermons />} />
          <Route path="events" element={<MemberEvents />} />
          <Route path="community" element={<MemberCommunity />} />
          <Route path="prayer" element={<MemberPrayer />} />
          <Route path="giving" element={<MemberGiving />} />
          <Route path="chat" element={<MemberChat />} />
          <Route path="settings" element={<MemberSettings />} />
        </Route>
        
        {/* Admin Routes (ADMIN and MODERATOR access) - Nested routing */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.MODERATOR]}>
              <AdminAccessGate>
                <AdminLayout />
              </AdminAccessGate>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRoute />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="content-dashboard"   element={<PermissionGatedRoute code="content.*"><ContentDashboard /></PermissionGatedRoute>} />
          <Route path="community-dashboard" element={<PermissionGatedRoute code="community.*"><CommunityDashboard /></PermissionGatedRoute>} />
          <Route path="ministry-dashboard"  element={<PermissionGatedRoute code="schedule.*"><MinistryHub /></PermissionGatedRoute>} />
          {/* <Route path="financial-dashboard" element={<PermissionGatedRoute code="fin.*"><FinancialDashboard /></PermissionGatedRoute>} /> */}
          <Route path="growth-dashboard"    element={<PermissionGatedRoute code="outreach.*"><GrowthDashboard /></PermissionGatedRoute>} />
          <Route path="content" element={<PermissionGatedRoute code="content.posts"><ContentManager /></PermissionGatedRoute>} />
          <Route path="series" element={<PermissionGatedRoute code="content.series"><SeriesManager /></PermissionGatedRoute>} />
          <Route path="series/new" element={<PermissionGatedRoute code="content.series"><SeriesCreate /></PermissionGatedRoute>} />
          <Route path="series/:id" element={<PermissionGatedRoute code="content.series"><SeriesEdit /></PermissionGatedRoute>} />
          {/* <Route path="daily-words" element={<DailyWordsPage />} /> TODO: Restore if bulk ops needed */}
          {/* <Route path="drafts" element={<PermissionGatedRoute code="content.drafts"><DraftsManager /></PermissionGatedRoute>} /> */}
          <Route path="weekly-flow" element={<PermissionGatedRoute code="schedule.weekly_flow"><WeeklyFlowPage /></PermissionGatedRoute>} />
          <Route path="seed" element={<PermissionGatedRoute code="fin.seed"><SeedManager /></PermissionGatedRoute>} />
          <Route path="seed/:id" element={<PermissionGatedRoute code="fin.seed"><SeedManager /></PermissionGatedRoute>} />
          <Route path="podcasting" element={<PermissionGatedRoute code="schedule.podcasting"><AdminPlaceholder title="Podcasting" icon="podcasts" description="Manage and publish podcast episodes directly from here." /></PermissionGatedRoute>} />
          <Route path="users" element={<AdminOnlyRoute><UserManager /></AdminOnlyRoute>} />
          <Route path="moderation" element={<PermissionGatedRoute code="community.moderation"><InteractionModeration /></PermissionGatedRoute>} />
          <Route path="small-groups" element={<PermissionGatedRoute code="community.groups"><AdminPlaceholder title="Small Groups" icon="groups_2" description="Oversee and manage church small group communities." /></PermissionGatedRoute>} />
          <Route path="prayer-wall" element={<PermissionGatedRoute code="community.prayer"><AdminPlaceholder title="Prayer Wall" icon="volunteer_activism" description="Monitor and moderate community prayer requests." /></PermissionGatedRoute>} />
          <Route path="events" element={<PermissionGatedRoute code="schedule.events"><AdminPlaceholder title="Events Calendar" icon="event" description="Create and manage church events and service schedules." /></PermissionGatedRoute>} />
          <Route path="volunteers" element={<PermissionGatedRoute code="community.volunteers"><AdminPlaceholder title="Volunteers" icon="manage_accounts" description="Coordinate volunteer roles, schedules and assignments." /></PermissionGatedRoute>} />
          <Route path="financial-hub" element={<PermissionGatedRoute code="fin.hub"><FinancialHub /></PermissionGatedRoute>} />
          <Route path="payments" element={<PermissionGatedRoute code="fin.payments"><PaymentRecords /></PermissionGatedRoute>} />
          {/* <Route path="financial-reports" element={<PermissionGatedRoute code="fin.reports"><FinancialReports /></PermissionGatedRoute>} /> */}
          <Route path="email" element={<PermissionGatedRoute code="outreach.email"><EmailCampaigns /></PermissionGatedRoute>} />
          <Route path="reports" element={<PermissionGatedRoute code="analytics.reports"><ModerationReports /></PermissionGatedRoute>} />
          <Route path="settings" element={<AdminOnlyRoute><AdminSettings /></AdminOnlyRoute>} />
        </Route>
        
        {/* Error Pages */}
        <Route path="/403" element={<Forbidden />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;