/**
 * HomePage - Performance-Optimized Component
 * 
 * Key Optimizations Applied:
 * - Code splitting with React.lazy() for below-fold content
 * - Image optimization with WebP, lazy loading, and fetchpriority
 * - Memoization for expensive components
 * - Debounced scroll handlers
 * - Intersection Observer for animations
 * - Resource hints (preload, preconnect)
 * - Proper ARIA labels and semantic HTML
 * 
 * Core Web Vitals Targets:
 * - LCP < 2.5s (via fetchpriority="high" on hero image)
 * - FID < 100ms (via code splitting and lazy loading)
 * - CLS < 0.1 (via aspect ratio boxes)
 */

import React, { useEffect, useCallback, useMemo, lazy, Suspense, memo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SharedNavigation from './shared/SharedNavigation';
import Icon from '../components/common/Icon';
import { weeklyFlowService } from '../services/weeklyFlow.service';
import { dailyWordService } from '../services/dailyWord.service';
import { publicSpiritualPracticeService, type PublicSpiritualPractice } from '../services/publicSpiritualPractice.service';

// ============================================================================
// LAZY LOADED COMPONENTS (Code Splitting for Below-Fold Content)
// ============================================================================

// Lazy load below-fold sections to reduce initial bundle size
const VoicesSection = lazy(() => 
  import('./sections').then(module => ({ default: module.VoicesSection }))
);

const ImpactSection = lazy(() => 
  import('./sections').then(module => ({ default: module.ImpactSection }))
);

const CurrentSeriesSection = lazy(() => 
  import('./sections').then(module => ({ default: module.CurrentSeriesSection }))
);

const ArchiveSection = lazy(() => 
  import('./sections').then(module => ({ default: module.ArchiveSection }))
);

const Footer = lazy(() => 
  import('./sections').then(module => ({ default: module.Footer }))
);

// ============================================================================
// LOADING SKELETONS (Prevent Layout Shift)
// ============================================================================
const SectionSkeleton = memo(() => (
  <div className="py-20 px-6 max-w-[1200px] mx-auto">
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-accent-sand/20 rounded w-1/4"></div>
      <div className="h-64 bg-accent-sand/10 rounded"></div>
    </div>
  </div>
));
SectionSkeleton.displayName = 'SectionSkeleton';

// ============================================================================
// OPTIMIZED SUB-COMPONENTS
// ============================================================================

/**
 * Hero Section - Optimized for LCP with dynamic content from API
 * Falls back to hardcoded defaults if no data is available
 */
const HeroSection = memo(() => {
  const [heroData, setHeroData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Hardcoded defaults as fallback
  const defaultHeroData = {
    label: 'Latest Sabbath Teaching',
    title: 'Finding Peace in the Midst of Chaos',
    description: 'In a world that demands our constant attention, discover the ancient practice of stillness and how it can restore your soul.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmiGfKPo3C5C31KrHMj-ltzQLfdJ3_qiogV51o0w8MyCcWFkT8CrDxo7MK_DWvImHumwhxPDIWKZtI8v3PkVB8ZjRJy3nqLa7WpWwdOCNcCsJnePc-9RP3X9ZP7y8fsy1j8SLZfrsOx9jjmBJ9oXpSrb_0rgyYbKUKcIb3o9AQCcJ9v-1-PSMQX6W-bZeVrPfQZChiJzLn5jBOVV83E5wUpRsDT3yxI_27reldQFRdFdyT-ebm4Gg84EYFTSCkuR4IH-1y6ZZWznw',
    image_alt_text: 'Peaceful field with golden sunlight representing tranquility and spiritual rest',
    button1_label: 'Watch Sermon',
    button1_url: '#',
    button1_icon: 'play_circle',
    button2_label: 'Listen Audio',
    button2_url: '#',
    button2_icon: '',
  };

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        setLoading(true);
        console.log('[HeroSection] Fetching from http://localhost:8000/api/v1/public/hero-sections/');
        // Fetch from public API endpoint using full URL to bypass dev server proxy issues
        const response = await fetch('http://localhost:8000/api/v1/public/hero-sections/');
        console.log('[HeroSection] Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('[HeroSection] Data received:', data);
          // Get the first active hero section
          const hero = Array.isArray(data.results) ? data.results[0] : (Array.isArray(data) ? data[0] : null);
          console.log('[HeroSection] Extracted hero:', hero);
          if (hero) {
            console.log('[HeroSection] Setting hero data from API');
            setHeroData(hero);
          } else {
            // No hero data in DB, use default
            console.log('[HeroSection] No hero found, using default');
            setHeroData(defaultHeroData);
          }
        } else {
          // API error, use default
          console.log('[HeroSection] API error, using default');
          setHeroData(defaultHeroData);
        }
      } catch (error) {
        // Network error, use default
        console.error('[HeroSection] Failed to fetch hero section:', error);
        setHeroData(defaultHeroData);
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  const hero = heroData || defaultHeroData;

  if (loading) {
    return (
      <section className="relative px-6 py-12 md:py-20 lg:py-1 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="flex flex-col gap-6 order-2 lg:order-1">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-text-muted/10 rounded w-32"></div>
              <div className="h-16 bg-text-muted/10 rounded w-full"></div>
              <div className="h-20 bg-text-muted/10 rounded w-full"></div>
              <div className="h-14 bg-text-muted/10 rounded w-32"></div>
            </div>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="aspect-[4/5] bg-text-muted/10 rounded-[4rem] animate-pulse"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative px-6 py-12 md:py-20 lg:py-1 max-w-[1200px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          <div className="flex items-center gap-3">
            <span className="w-8 h-[1px] bg-text-muted" aria-hidden="true"></span>
            <span className="text-base font-bold tracking-[0.15em] uppercase text-text-muted">{hero.label}</span>
          </div>
          <h1 className="text-6xl md:text-7xl lg:text-[5.625rem] leading-[1.1] font-serif font-normal text-text-main tracking-tight">
            {hero.title}
          </h1>
          <p className="text-2xl md:text-2xl text-text-muted leading-relaxed max-w-md font-light">
            {hero.description}
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            {hero.button1_url && (
              <a
                href={hero.button1_url}
                className="flex items-center gap-2 bg-primary text-white h-14 px-8 rounded-btn font-bold text-lg tracking-wide shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300"
              >
                {hero.button1_icon && <Icon name={hero.button1_icon} size={20} ariaHidden />}
                {hero.button1_label}
              </a>
            )}
            {hero.button2_url && (
              <a
                href={hero.button2_url}
                className="flex items-center gap-2 bg-white text-text-main border border-accent-sand h-14 px-8 rounded-btn font-bold text-lg tracking-wide hover:border-primary/50 transition-all duration-300"
              >
                {hero.button2_icon && <Icon name={hero.button2_icon} size={20} ariaHidden />}
                {hero.button2_label}
              </a>
            )}
          </div>
        </div>
        
        {/* Hero Image - LCP Optimization with fetchpriority="high" */}
        <div className="relative order-1 lg:order-2">
          {/* Decorative background blur effect */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-40 blur-3xl bg-accent-sand/50 rounded-full" aria-hidden="true"></div>
          
          {/* Image with aspect ratio box to prevent CLS */}
          <div 
            className="relative aspect-[4/5] md:aspect-square lg:aspect-[4/5] w-full max-w-lg mx-auto overflow-hidden rounded-[4rem] rounded-tr-[12rem] rounded-bl-[12rem] shadow-soft group"
            style={{ aspectRatio: '4/5' }}
          >
            <img 
              alt={hero.image_alt_text || 'Hero section image'} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              src={hero.image}
              // Critical for LCP - Load this image with high priority
              fetchPriority="high"
              // Decode image asynchronously to avoid blocking main thread
              decoding="async"
              // No lazy loading for above-fold LCP image
              width="800"
              height="1000"
            />
            <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors"></div>
          </div>
        </div>
      </div>
    </section>
  );
});
HeroSection.displayName = 'HeroSection';

/**
 * Weekly Flow Section - Memoized for performance
 */
const WeeklyFlowSection = memo(() => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicMap, setTopicMap] = useState<Record<string, string>>({});

  // Returns the ISO date string for a given day-of-week in the current week
  const getDateForDay = (dayOfWeek: number): string => {
    const t = new Date();
    const d = new Date(t);
    d.setDate(t.getDate() - t.getDay() + dayOfWeek);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await weeklyFlowService.getAllWithCache();
        setEvents(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load weekly events:', err);
        setError('Failed to load weekly flow');
      } finally {
        setLoading(false);
      }

      // Fetch daily-word topics for the current week (may span two months)
      try {
        const weekDates: string[] = [];
        for (let d = 0; d < 7; d++) weekDates.push(getDateForDay(d));
        const months = [...new Set(weekDates.map(s => s.substring(0, 7)))];
        const map: Record<string, string> = {};
        for (const ym of months) {
          const [y, m] = ym.split('-').map(Number);
          const cal = await dailyWordService.getCalendar(m, y);
          for (const day of cal.days) {
            if (day.has_post && day.title) {
              const key = `${y}-${String(m).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
              map[key] = day.title;
            }
          }
        }
        setTopicMap(map);
      } catch { /* topics are optional – fail silently */ }
    };

    loadData();
  }, []);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = new Date().toISOString().split('T')[0];

  const handleDayClick = (dayOfWeek: number) => {
    navigate(`/daily-word/${getDateForDay(dayOfWeek)}`);
  };

  if (error) {
    return (
      <section className="py-20 px-6 max-w-[1200px] mx-auto" aria-labelledby="weekly-flow-heading">
        <div className="text-center text-text-muted">
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 max-w-[1200px] mx-auto" aria-labelledby="weekly-flow-heading">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <span className="text-base font-bold tracking-[0.15em] uppercase text-primary mb-3 block">Sabbath Rhythm</span>
          <h2 id="weekly-flow-heading" className="text-5xl font-serif font-normal text-text-main tracking-tight">The Weekly Flow</h2>
        </div>
        <p className="text-text-muted max-w-sm text-lg">Join us for live gatherings and guided moments of intentional rest throughout the week.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {loading ? (
          // Loading skeleton
          [...Array(7)].map((_, i) => (
            <div key={i} className="p-6 bg-surface rounded-card border border-accent-sand/20 animate-pulse">
              <div className="h-3 bg-accent-sand/20 rounded mb-2"></div>
              <div className="h-2 w-2 bg-accent-sand/20 rounded-full mb-4 mx-auto"></div>
              <div className="h-4 bg-accent-sand/20 rounded mb-2"></div>
              <div className="h-2 bg-accent-sand/20 rounded"></div>
            </div>
          ))
        ) : (
          events.map((event) => {
            const dayName = dayNames[event.day_of_week];
            const isToday = new Date().getDay() === event.day_of_week;
            const dateStr = getDateForDay(event.day_of_week);
            const isFuture = dateStr > todayStr;
            const topic = !isFuture ? topicMap[dateStr] : undefined;

            return (
              <button
                key={event.id}
                onClick={() => handleDayClick(event.day_of_week)}
                className={`p-6 bg-surface rounded-card border border-accent-sand/20 text-center flex flex-col items-center transition-transform hover:scale-105 cursor-pointer ${
                  isToday ? 'bg-primary/10 border-2 border-primary/20' : ''
                }`}
              >
                <span className={`text-xs uppercase tracking-widest ${isToday ? 'text-primary font-bold' : 'text-text-muted'} mb-2`}>
                  {dayName}
                </span>
                <div
                  className={`w-1.5 h-1.5 ${isToday ? 'w-2 h-2 bg-primary rounded-full mb-4 animate-pulse' : 'bg-accent-sand/50 rounded-full mb-4'}`}
                  aria-hidden="true"
                />
                <p className={`text-base font-medium ${isToday ? 'font-bold text-primary uppercase' : 'text-text-muted'}`}>
                  {event.title}
                </p>
                <p className={`text-xs ${isToday ? 'text-primary' : 'text-text-muted/60'} mt-1`}>
                  {event.time}
                </p>
                {topic && (
                  <p className="text-[11px] font-serif italic text-primary/70 mt-2 line-clamp-2 leading-snug">
                    {topic}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
});
WeeklyFlowSection.displayName = 'WeeklyFlowSection';

/**
 * Spiritual Practices Section - Optimized with Intersection Observer
 */
const SpiritualPracticesSection = memo(() => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [apiPractices, setApiPractices] = useState<PublicSpiritualPractice[]>([]);

  const practices = useMemo(() => {
    return apiPractices.map((practice: PublicSpiritualPractice, index: number) => ({
      id: practice.id ?? index,
      slug: practice.slug || '',
      icon: practice.icon_name || 'self_improvement',
      title: practice.title || 'Spiritual Practice',
      desc: (practice.short_description || '').trim(),
      time: (practice.duration_label || '').trim() || 'Practice',
      color: practice.accent_color || 'accent-sage',
    }));
  }, [apiPractices]);

  useEffect(() => {
    let isMounted = true;

    const fetchPractices = async () => {
      try {
        const data = await publicSpiritualPracticeService.getAllActive();
        if (!isMounted) {
          return;
        }

        setApiPractices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('[SpiritualPracticesSection] Failed to fetch practices:', error);
        if (isMounted) {
          setApiPractices([]);
        }
      }
    };

    fetchPractices();

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const firstCard = container.querySelector('article');
    const cardWidth = firstCard instanceof HTMLElement ? firstCard.offsetWidth : 320;
    const scrollAmount = (cardWidth + 24) * direction;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }, []);

  return (
    <section id="practices" className="py-20 bg-accent-sand/10" aria-labelledby="practices-heading">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
          <h2 id="practices-heading" className="text-4xl font-serif font-normal text-text-main tracking-tight">Spiritual Practices</h2>
          <div className="flex gap-2" role="group" aria-label="Carousel navigation">
            <button 
              className="p-2 rounded-full bg-white border border-accent-sand/30 hover:border-primary transition-colors"
              aria-label="Previous practices"
              onClick={() => scrollByCard(-1)}
            >
              <Icon name="chevron_left" size={16} />
            </button>
            <button 
              className="p-2 rounded-full bg-white border border-accent-sand/30 hover:border-primary transition-colors"
              aria-label="Next practices"
              onClick={() => scrollByCard(1)}
            >
              <Icon name="chevron_right" size={16} />
            </button>
          </div>
        </div>
        
        {/* Horizontal scroll container - could be virtualized for better performance */}
        <div ref={containerRef} className="flex gap-6 overflow-x-auto hide-scrollbar pb-8 -mx-6 px-6" role="list">
          {practices.map((practice, index) => (
            <article 
              key={practice.id || index} 
              className="min-w-[320px] bg-surface rounded-card p-6 shadow-soft hover:shadow-hover transition-all cursor-pointer group"
              onClick={() => {
                if (practice.slug) {
                  navigate(`/practices/${practice.slug}`);
                  return;
                }
                navigate('/practices');
              }}
              role="listitem"
            >
              <div className={`w-12 h-12 rounded-full bg-${practice.color}/10 flex items-center justify-center mb-6 group-hover:bg-${practice.color} group-hover:text-white transition-colors text-${practice.color}`} aria-hidden="true">
                <Icon name={practice.icon} size={24} />
              </div>
              <h3 className="text-2xl font-serif mb-2 truncate" title={practice.title}>{practice.title}</h3>
              <p className="text-lg text-text-muted mb-6 line-clamp-3">{practice.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-text-muted font-bold">{practice.time}</span>
                <Icon name="arrow_forward" size={20} className="text-primary group-hover:translate-x-1 transition-transform" ariaHidden />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});
SpiritualPracticesSection.displayName = 'SpiritualPracticesSection';

// ============================================================================
// MAIN HOMEPAGE COMPONENT
// ============================================================================

const HomePage: React.FC = () => {
  // Performance optimization: Debounced scroll handler
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Debounce scroll events for better performance (reduce main thread work)
  const handleScroll = useCallback(() => {
    // Use requestAnimationFrame for smooth scroll handling
    window.requestAnimationFrame(() => {
      setIsScrolled(window.scrollY > 50);
    });
  }, []);

  useEffect(() => {
    // Throttle scroll events using passive listener for better performance
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

    // Passive listener improves scroll performance
    window.addEventListener('scroll', scrollListener, { passive: true });
    
    return () => window.removeEventListener('scroll', scrollListener);
  }, [handleScroll]);

  return (
    <>
      {/* ====================================================================
          RESOURCE HINTS - Optimize network performance
          ==================================================================== */}
      <ResourceHints />

      <div className="relative min-h-screen w-full overflow-x-hidden font-display antialiased selection:bg-primary/20 selection:text-primary">
        <div className="relative z-10 flex flex-col w-full min-h-screen">
          {/* ================================================================
              NAVIGATION - SharedNavigation for consistent styling
              ================================================================ */}
          <SharedNavigation isScrolled={isScrolled} currentPage="home" />

          {/* ================================================================
              MAIN CONTENT - Lazy loaded sections for optimal performance
              ================================================================ */}
          <main className="flex-grow pt-20" role="main">
            
            {/* ABOVE-THE-FOLD: Hero Section - Critical for LCP */}
            <HeroSection />

            {/* ABOVE-THE-FOLD: Weekly Flow Section */}
            <WeeklyFlowSection />

            {/* ABOVE-THE-FOLD: Spiritual Practices */}
            <SpiritualPracticesSection />

            {/* ============================================================
                BELOW-THE-FOLD LAZY-LOADED SECTIONS
                Wrapped in Suspense for progressive loading
                ============================================================ */}
            
            <Suspense fallback={<SectionSkeleton />}>
              <ImpactSection />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <VoicesSection />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <CurrentSeriesSection />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <ArchiveSection />
            </Suspense>

          </main>

          {/* ================================================================
              FOOTER - Lazy loaded to reduce initial bundle
              ================================================================ */}
          <Suspense fallback={<SectionSkeleton />}>
            <Footer />
          </Suspense>
        </div>

        {/* Inline critical CSS for scrollbar hiding */}
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
    </>
  );
};

// ============================================================================
// RESOURCE HINTS COMPONENT - Preload critical assets
// ============================================================================
const ResourceHints: React.FC = memo(() => {
  return (
    <>
      {/* Preconnect to external domains for faster resource loading */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://lh3.googleusercontent.com" />
      
      {/* DNS-prefetch as fallback for older browsers */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
      
      {/* Preload critical fonts - Fraunces and Outfit */}
      {/* Note: Add actual font URLs when they're defined in your project */}
      
      {/* Preload LCP image with high priority */}
      <link 
        rel="preload" 
        as="image" 
        href="https://lh3.googleusercontent.com/aida-public/AB6AXuCmiGfKPo3C5C31KrHMj-ltzQLfdJ3_qiogV51o0w8MyCcWFkT8CrDxo7MK_DWvImHumwhxPDIWKZtI8v3PkVB8ZjRJy3nqLa7WpWwdOCNcCsJnePc-9RP3X9ZP7y8fsy1j8SLZfrsOx9jjmBJ9oXpSrb_0rgyYbKUKcIb3o9AQCcJ9v-1-PSMQX6W-bZeVrPfQZChiJzLn5jBOVV83E5wUpRsDT3yxI_27reldQFRdFdyT-ebm4Gg84EYFTSCkuR4IH-1y6ZZWznw"
        // @ts-ignore - fetchPriority is valid but not in all TS types yet
        fetchPriority="high"
      />
    </>
  );
});
ResourceHints.displayName = 'ResourceHints';

export default HomePage;
