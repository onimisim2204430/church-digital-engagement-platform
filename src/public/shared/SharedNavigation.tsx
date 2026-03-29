/**
 * SharedNavigation - Optimized Navigation Component
 * Used across HomePage and LibraryPage for consistency
 * 
 * Performance Features:
 * - React.memo to prevent unnecessary re-renders
 * - useMemo for computed class names
 * - Lazy loaded MegaMenu component
 * - Proper ARIA labels for accessibility
 */

import { memo, useMemo, useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Icon from '../../components/common/Icon';

// Lazy load MegaMenu for better performance
const MegaMenu = lazy(() => 
  import('../components').then(module => ({ default: module.MegaMenu }))
);

interface SharedNavigationProps {
  isScrolled?: boolean;
  currentPage?: 'home' | 'library' | 'series' | 'practices' | 'connect' | 'events' | 'bible' | 'giving' | 'contact';
  fullWidth?: boolean; // If true, removes max-width and uses full width
}

const SharedNavigation = memo(({ isScrolled = false, currentPage, fullWidth = true }: SharedNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  // State for mega menu visibility
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  // State for mobile menu visibility
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [showMobileMenu]);

  // Memoize navigation classes based on scroll state
  const navClasses = useMemo(() => {
    const base = 'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b';
    const scrollClasses = isScrolled 
      ? 'bg-background-light/95 border-accent-sand/30 shadow-sm'
      : 'border-transparent bg-background-light/90';
    return `${base} ${scrollClasses} backdrop-blur-sm will-change-transform`;
  }, [isScrolled]);

  const activePage = useMemo(() => {
    const pathname = location.pathname.toLowerCase();

    if (pathname === '/') return 'home';
    if (pathname === '/library/series' || pathname.startsWith('/library/series/')) return 'series';
    if (pathname.startsWith('/library/sermon/')) return 'library';
    if (pathname === '/library' || pathname.startsWith('/library/')) return 'library';
    if (pathname === '/bible' || pathname.startsWith('/bible/')) return 'bible';
    if (pathname === '/practices' || pathname.startsWith('/practices/')) return 'practices';
    if (pathname === '/connect' || pathname.startsWith('/connect/')) return 'connect';
    if (pathname === '/events' || pathname.startsWith('/events/')) return 'events';
    if (pathname === '/giving' || pathname.startsWith('/giving/')) return 'giving';

    return currentPage;
  }, [location.pathname, currentPage]);

  // Determine if a nav item is active
  const isActive = (page: string) => activePage === page;
  const isLibraryClusterActive = activePage === 'library' || activePage === 'series';
  const isConnectClusterActive = activePage === 'connect' || activePage === 'events' || activePage === 'giving';

  return (
    <>
      <nav className={navClasses} role="navigation" aria-label="Main navigation">
        <div className={`h-20 flex items-center justify-between ${fullWidth ? 'w-full px-8' : 'max-w-[1200px] mx-auto px-6'}`}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 text-text-main" aria-label="Serene Sanctuary Home">
          <Icon name="spa" size={24} className="text-primary" ariaHidden />
          <span className="font-display font-semibold tracking-tight text-text-main">Serene Sanctuary</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {/* Library with Mega Menu */}
          <div 
            className="group relative py-7"
            onMouseEnter={() => setShowMegaMenu(true)}
            onMouseLeave={() => setShowMegaMenu(false)}
          >
            <button 
              className={`flex items-center gap-1 font-medium transition-colors ${
                isLibraryClusterActive ? 'text-primary' : 'text-text-main hover:text-primary'
              }`}
              aria-expanded={showMegaMenu}
              aria-haspopup="true"
              aria-current={isLibraryClusterActive ? 'page' : undefined}
            >
              Library <Icon name="expand_more" size={16} ariaHidden />
            </button>
            {showMegaMenu && (
              <Suspense fallback={
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-surface shadow-hover rounded-card p-8 border border-accent-sand/20">
                  Loading...
                </div>
              }>
                <MegaMenu currentPage={activePage} />
              </Suspense>
            )}
          </div>

          {/* Navigation Links */}
          <Link 
            to="/bible" 
            className={`font-medium transition-colors ${
              isActive('bible') ? 'text-primary' : 'text-text-main hover:text-primary'
            }`}
            aria-current={isActive('bible') ? 'page' : undefined}
          >
            Open Bible
          </Link>
          <Link 
            to="/practices" 
            className={`font-medium transition-colors ${
              isActive('practices') ? 'text-primary' : 'text-text-main hover:text-primary'
            }`}
            aria-current={isActive('practices') ? 'page' : undefined}
          >
            Practices
          </Link>
          <Link 
            to="/events" 
            className={`font-medium transition-colors ${
              isActive('events') ? 'text-primary' : 'text-text-main hover:text-primary'
            }`}
            aria-current={isActive('events') ? 'page' : undefined}
          >
            Events
          </Link>
          <Link 
            to="/connect" 
            className={`font-medium transition-colors ${
              isConnectClusterActive ? 'text-primary' : 'text-text-main hover:text-primary'
            }`}
            aria-current={isConnectClusterActive ? 'page' : undefined}
          >
            Connect
          </Link>
        </div>

        {/* CTA and Mobile Menu */}
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <button 
              onClick={() => navigate('/login')}
              className="hidden md:flex items-center justify-center px-6 h-10 rounded-btn border border-primary/20 text-primary font-bold tracking-wide hover:bg-primary hover:text-white transition-all duration-300"
              aria-label="Login to your account"
            >
              Login
            </button>
          ) : (
            <button 
              onClick={() => navigate('/member')}
              className="hidden md:flex items-center justify-center px-6 h-10 rounded-btn border border-primary/20 text-primary font-bold tracking-wide hover:bg-primary hover:text-white transition-all duration-300"
              aria-label="Go to member portal"
            >
              Portal
            </button>
          )}
          <button 
            className="md:hidden p-2 text-text-main"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label={showMobileMenu ? "Close menu" : "Open menu"}
            aria-expanded={showMobileMenu}
          >
            <Icon name={showMobileMenu ? 'close' : 'menu'} size={24} />
          </button>
        </div>
      </div>
    </nav>

      {/* Mobile Sidebar */}
      {showMobileMenu && (
        <>
          {/* Backdrop/Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          ></div>

          {/* Sidebar */}
          <div 
            className="fixed top-0 right-0 bottom-0 w-[280px] bg-background-light z-[70] md:hidden shadow-2xl animate-slide-in-right flex flex-col"
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-6 border-b border-accent-sand/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Icon name="spa" size={28} className="text-primary" ariaHidden />
                <span className="font-display font-semibold text-base tracking-tight text-text-main">Menu</span>
              </div>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-text-main hover:text-primary transition-colors"
                aria-label="Close menu"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col p-6 space-y-2 flex-1 overflow-y-auto">
              <Link 
                to="/" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isActive('home') ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isActive('home') ? 'page' : undefined}
              >
                <Icon name="home" size={16} />
                Home
              </Link>
              
              <Link 
                to="/library" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isActive('library') ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isActive('library') ? 'page' : undefined}
              >
                <Icon name="library_books" size={16} />
                Library
              </Link>
              
              <Link 
                to="/bible" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isActive('bible') ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isActive('bible') ? 'page' : undefined}
              >
                <Icon name="menu_book" size={16} />
                Open Bible
              </Link>
              
              <Link 
                to="/library/series" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isActive('series') ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isActive('series') ? 'page' : undefined}
              >
                <Icon name="collections_bookmark" size={16} />
                Series
              </Link>
              
              <Link 
                to="/practices" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isActive('practices') ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isActive('practices') ? 'page' : undefined}
              >
                <Icon name="self_improvement" size={16} />
                Practices
              </Link>
              
              <Link 
                to="/connect" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isConnectClusterActive ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isConnectClusterActive ? 'page' : undefined}
              >
                <Icon name="group" size={16} />
                Connect
              </Link>

              <Link 
                to="/events" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isActive('events') ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isActive('events') ? 'page' : undefined}
              >
                <Icon name="event" size={16} />
                Events
              </Link>

              <Link 
                to="/giving" 
                className={`flex items-center gap-3 px-4 py-3 rounded-btn text-base font-medium transition-colors ${
                  isActive('giving') ? 'bg-primary/10 text-primary' : 'text-text-main hover:bg-accent-sand/20 hover:text-primary'
                }`}
                onClick={() => setShowMobileMenu(false)}
                aria-current={isActive('giving') ? 'page' : undefined}
              >
                <Icon name="volunteer_activism" size={16} />
                Giving
              </Link>

              {/* Divider */}
              <div className="border-t border-accent-sand/30 my-4"></div>

              {/* Auth Button */}
              {!isAuthenticated ? (
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/login');
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-btn bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-all duration-300"
                >
                  <Icon name="login" size={16} />
                  Login
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/member');
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-btn bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-all duration-300"
                >
                  <Icon name="dashboard" size={16} />
                  Portal
                </button>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-accent-sand/30 bg-white/50 backdrop-blur-sm flex-shrink-0">
              <p className="text-sm text-text-muted text-center">
                © 2026 Serene Sanctuary
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
});

SharedNavigation.displayName = 'SharedNavigation';

export default SharedNavigation;
