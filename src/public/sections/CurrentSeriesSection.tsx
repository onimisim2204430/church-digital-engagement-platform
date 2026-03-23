import React, { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import seriesService, { type CurrentSeriesSpotlight } from '../../services/series.service';

/**
 * CurrentSeriesSection Component - Lazy loaded below-fold content
 * Displays the current teaching series with optimized image loading
 */
const CurrentSeriesSection: React.FC = memo(() => {
  const [spotlight, setSpotlight] = useState<CurrentSeriesSpotlight | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSpotlight = async () => {
      try {
        const data = await seriesService.getPublicCurrentSeriesSpotlight();
        if (!mounted) return;
        setSpotlight(data);
      } catch (error) {
        console.error('Failed to load current series spotlight', error);
        if (mounted) {
          setSpotlight(null);
        }
      }
    };

    loadSpotlight();

    return () => {
      mounted = false;
    };
  }, []);

  const fallbackData = useMemo(() => ({
    sectionLabel: 'Current Series',
    title: 'The Garden of The Heart',
    description: 'Exploring the parables of growth, patience, and the seasons of our spiritual lives.',
    ctaLabel: 'View Series Collection',
    href: '/library/series',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbQRlebKrM7_ulJKacCS14CaI51zmgvdyk_Ljqgh7ytXvx7JQ198tbBH7I4o8q52Rhv6-EuXSMxa12EBYNNHsOOeQc3hoyY8iBGgfEetcY2MhJEKkE2Dt99veogy1i_lcLaiQUXwmMWQLPSKYc6IPUS1fQb73L9dapz7ArCuo3iTMnKa_A1nwGcTZ1a47lhA4cVUGGVlWrh42I-W_l4qkXvt_NBH4Tjb6iD1SFiN2W1b8oLL-fZXWNKEruHsmZvhuFMK_pEDyj6-4',
    imageAlt: 'The Garden of The Heart series artwork featuring minimalist botanical design',
    latestPartLabel: 'Part 4 Available',
    decorativeNumber: '04',
  }), []);

  const viewData = useMemo(() => {
    if (!spotlight || !spotlight.is_active || !spotlight.series) {
      return fallbackData;
    }

    const series = spotlight.series;
    const latestPartNumber = Math.max(1, spotlight.latest_part_number || 1);
    const parsedNumber = String(latestPartNumber).padStart(2, '0');
    const statusLabel = spotlight.latest_part_status === 'COMING_SOON' ? 'Coming Soon' : 'Available';

    return {
      sectionLabel: spotlight.section_label || 'Current Series',
      title: series.title,
      description: (spotlight.description_override || '').trim() || series.description || fallbackData.description,
      ctaLabel: spotlight.cta_label || 'View Series Collection',
      href: `/library/series/${series.slug}`,
      image: series.cover_image || fallbackData.image,
      imageAlt: `${series.title} series artwork`,
      latestPartLabel: `Part ${latestPartNumber} ${statusLabel}`,
      decorativeNumber: parsedNumber,
    };
  }, [spotlight, fallbackData]);

  const titleParts = useMemo(() => {
    const words = viewData.title.trim().split(/\s+/);
    if (words.length < 2) {
      return { first: viewData.title, second: '' };
    }
    const splitIndex = Math.ceil(words.length / 2);
    return {
      first: words.slice(0, splitIndex).join(' '),
      second: words.slice(splitIndex).join(' '),
    };
  }, [viewData.title]);

  return (
    <section 
      id="series"
      className="w-full bg-[#EBE9E4] py-16 md:py-24 border-y border-[#D8Cbbd]/30" 
      aria-labelledby="series-heading"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <span className="inline-block px-3 py-1 rounded-full border border-text-muted/30 text-base font-bold tracking-widest uppercase text-text-muted">
              {viewData.sectionLabel}
            </span>
            <h2 id="series-heading" className="text-5xl md:text-6xl lg:text-7xl font-display text-text-main leading-tight">
              {titleParts.first}
              {titleParts.second ? (
                <>
                  <br />
                  <span className="italic text-primary">{titleParts.second}</span>
                </>
              ) : null}
            </h2>
            <p className="text-text-muted text-2xl max-w-md mx-auto md:mx-0">
              {viewData.description}
            </p>
            <div className="pt-4">
              <Link
                to={viewData.href}
                className="inline-flex items-center text-primary font-bold text-lg hover:underline underline-offset-4 decoration-2"
                aria-label="View full series collection"
              >
                {viewData.ctaLabel}
                <Icon name="arrow_forward" size={16} className="ml-1" ariaHidden />
              </Link>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center md:justify-end gap-8 relative">
            {/* Decorative number - hidden from screen readers */}
            <span 
              className="hidden lg:block text-[15rem] leading-none font-display font-light text-text-main/5 select-none absolute -left-12"
              aria-hidden="true"
            >
              {viewData.decorativeNumber}
            </span>
            {/* Aspect ratio container prevents CLS */}
            <Link
              to={viewData.href}
              className="relative w-full max-w-sm aspect-[3/4] rounded-t-full rounded-b-[1000px] overflow-hidden shadow-soft group cursor-pointer"
              style={{ aspectRatio: '3/4' }}
            >
              {/* Optimized image with lazy loading */}
              <img 
                alt={viewData.imageAlt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                src={viewData.image}
                loading="lazy"
                decoding="async"
                width="400"
                height="533"
              />
              <div className="absolute bottom-6 left-0 right-0 text-center">
                <span className="inline-flex items-center bg-white/90 backdrop-blur text-text-main h-10 px-5 rounded-full text-base font-bold uppercase tracking-widest shadow-sm hover:bg-primary hover:text-white transition-colors">
                  {viewData.latestPartLabel}
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

CurrentSeriesSection.displayName = 'CurrentSeriesSection';

export default CurrentSeriesSection;
