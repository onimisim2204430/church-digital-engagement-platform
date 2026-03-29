/**
 * Main Application Entry Point
 */

import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { BibleProvider } from './bible';
import AppRouter from './router/AppRouter';
import './styles/ConfirmModal.css';

class BibleErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error('[Bible Module Error]', err); }
  render() {
    if (this.state.hasError) {
      return (
        <>
          <div style={{ background: '#fff3cd', fontSize: '13px' }}>

          </div>
          {this.props.children}
        </>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const appTree = (
    <BibleErrorBoundary>
      <BibleProvider defaultTranslation="KJV">
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              {/* Global Background Grain Overlay */}
              <div className="fixed inset-0 pointer-events-none z-[1] bg-grain opacity-40 mix-blend-multiply" aria-hidden="true"></div>
              
              {/* App Content */}
              <div className="relative z-[2]">
                <AppRouter />
              </div>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </BibleProvider>
    </BibleErrorBoundary>
  );

  const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  if (!googleClientId) {
    return appTree;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>;
};

export default App;
