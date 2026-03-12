/**
 * PublicLayout Component
 * Default layout for all non-member and non-admin pages
 * Includes SharedNavigation and Footer
 */

import React, { useState, useEffect, useCallback, memo, Suspense, lazy } from 'react';
import SharedNavigation from '../shared/SharedNavigation';

// Lazy load Footer for better performance
const Footer = lazy(() => 
  import('../sections').then(module => ({ default: module.Footer }))
);

interface PublicLayoutProps {
  children: React.ReactNode;
  currentPage?: 'home' | 'library' | 'series' | 'practices' | 'connect' | 'events';
  fullWidth?: boolean; // If true, removes max-width constraints
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children, currentPage, fullWidth = true }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll handler for navigation styling
  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    let ticking = false;
    
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener, { passive: true });
    
    return () => window.removeEventListener('scroll', scrollListener);
  }, [handleScroll]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden font-display antialiased selection:bg-primary/20 selection:text-primary">

      <div className="relative z-10 flex flex-col w-full min-h-screen">
        {/* Navigation */}
        <SharedNavigation isScrolled={isScrolled} currentPage={currentPage} fullWidth={fullWidth} />

        {/* Main Content */}
        <main className="flex-grow pt-20" role="main">
          {children}
        </main>

        {/* Footer */}
        <Suspense fallback={
          <div className="py-20 px-6 bg-surface">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-accent-sand/20 rounded w-1/4"></div>
              <div className="h-32 bg-accent-sand/10 rounded"></div>
            </div>
          </div>
        }>
          <Footer fullWidth={fullWidth} />
        </Suspense>
      </div>

      {/* Inline critical CSS for scrollbar */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default memo(PublicLayout);
