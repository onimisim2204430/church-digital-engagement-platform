import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';

/**
 * Footer Component - Lazy loaded to reduce initial bundle size
 * Contains site navigation and contact information
 */

interface FooterProps {
  fullWidth?: boolean; // If true, removes max-width and uses full width
}

const Footer: React.FC<FooterProps> = memo(({ fullWidth = true }) => {
  return (
    <footer className="bg-surface border-t border-accent-sand/30 py-20" role="contentinfo">
      <div className={fullWidth ? 'w-full px-8' : 'max-w-[1200px] mx-auto px-6'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 text-text-main mb-6" aria-label="Serene Sanctuary Home">
              <Icon name="spa" size={30} className="text-primary" />
              <span className="font-display font-semibold text-2xl tracking-tight">Serene Sanctuary</span>
            </Link>
            <p className="text-text-muted max-w-sm leading-relaxed text-lg">
              A digital porch for spiritual formation, emphasizing peace over promotion and presence over performance.
            </p>
          </div>
          <nav className="flex flex-col" aria-labelledby="footer-nav-heading">
            <h2 id="footer-nav-heading" className="text-base font-bold uppercase tracking-widest text-text-main mb-6">Navigation</h2>
            <ul className="space-y-4 text-lg text-text-muted">
              <li><Link to="/library" className="hover:text-primary transition-colors">The Library</Link></li>
              <li><Link to="/library/series" className="hover:text-primary transition-colors">Teaching Series</Link></li>
              <li><Link to="/practices" className="hover:text-primary transition-colors">Spiritual Practices</Link></li>
              <li><Link to="/connect" className="hover:text-primary transition-colors">Connect</Link></li>
              <li><Link to="/events" className="hover:text-primary transition-colors">Events</Link></li>
            </ul>
          </nav>
          <nav className="flex flex-col" aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading" className="text-base font-bold uppercase tracking-widest text-text-main mb-6">Contact</h2>
            <ul className="space-y-4 text-lg text-text-muted">
              <li><Link to="/connect" className="hover:text-primary transition-colors">Connect Form</Link></li>
              <li><Link to="/giving" className="hover:text-primary transition-colors">Giving</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </nav>
        </div>
        <div className="pt-12 border-t border-accent-sand/20 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-text-muted text-xs uppercase tracking-[0.2em]">
            © 2024 Serene Sanctuary. Digital Sabbath.
          </p>
          <div className="flex gap-6" role="list" aria-label="Social media links">
            <a 
              href="https://facebook.com" 
              className="text-text-muted hover:text-primary transition-colors"
              aria-label="Follow us on social media"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="brand_family" size={22} />
            </a>
            <a 
              href="/rss.xml" 
              className="text-text-muted hover:text-primary transition-colors"
              aria-label="Subscribe to our RSS feed"
            >
              <Icon name="rss_feed" size={22} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
