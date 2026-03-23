import React, { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import seriesService, { type Series } from '../../services/series.service';

interface MegaMenuProps {
  currentPage?: 'home' | 'library' | 'series' | 'practices' | 'connect' | 'events' | 'bible' | 'giving';
}

/**
 * MegaMenu Component - Lazy loaded for performance
 * Split from main navigation to reduce initial bundle size
 */
const MegaMenu: React.FC<MegaMenuProps> = memo(({ currentPage }) => {
  const [latestSeries, setLatestSeries] = useState<Series[]>([]);

  const isLibraryClusterPage = currentPage === 'library' || currentPage === 'series';

  useEffect(() => {
    let isMounted = true;

    const loadLatestSeries = async () => {
      try {
        const featured = await seriesService.getFeaturedSeries();
        if (!isMounted) return;

        if (featured.length > 0) {
          setLatestSeries(featured.slice(0, 2));
          return;
        }

        const publicSeries = await seriesService.getPublicSeries();
        if (!isMounted) return;
        setLatestSeries(publicSeries.slice(0, 2));
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load library dropdown series', error);
        setLatestSeries([]);
      }
    };

    loadLatestSeries();

    return () => {
      isMounted = false;
    };
  }, []);

  const latestItems = useMemo(() => {
    if (latestSeries.length > 0) {
      return latestSeries.map((item) => {
        const postCount = item.published_post_count || item.post_count || 0;
        return {
          id: item.id,
          title: item.title,
          description: `${postCount} post${postCount === 1 ? '' : 's'} · Series`,
          image: item.cover_image || '',
          to: `/library/series/${item.slug}`,
        };
      });
    }

    return [
      {
        id: 'fallback-1',
        title: 'Explore Sermon Series',
        description: 'Curated teaching journeys for every season',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAA2nq4s3J1jgEiPNOw6LlxJjveanLeRhCAN-FMVpgJUgbnOCsvvtFwUq5YnDiFgpF3BUf8_CKjMcUZDX5KE0bIGcNvB9viHCZri7WLKAalRc0p4j3PvgEaozH0ztWhpZKmsbrXktPUoboM3o7ClEGhRV9s7sGz3cgBX1o8OB8iRYGbfkKZc45Uv8CiuFy2YRhcjOSNM3X4_LXrpWcVS3LKobd9oXd22kMpQqtJSu33MlK0DYsRdRs0nYcJkec4JwplBbaOBrioVIw',
        to: '/library/series',
      },
      {
        id: 'fallback-2',
        title: 'Recent Library Updates',
        description: 'New messages and resources added weekly',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_0GiwP4BFAbIn7Rm0x4C0uc3VC052VXdrrOlxSoOjENPsk6DaI58tKq_x6tTeaUFqLxRlukC2q71l8fcdHIVVYoC7S9aMWGWXdFJPrbyo4fCACrdl4hmKReYQjo6NAaJbY_JDdQgWuYGSw2PwpvEnM7fExEVgWW_Mz1DTj8tNYzxIprea7LZHkgv-6y0p-PLalzKEMpeQ34okoZGDKV8aBVQebwhivVi0af31shHRXdjU8-FgdZQ97lXkUHetnYm2MFPOZaSPoPo',
        to: '/library',
      },
    ];
  }, [latestSeries]);
  
  return (
    <div className="mega-menu absolute top-full left-1/2 -translate-x-1/2 w-[600px] bg-surface shadow-hover rounded-card p-8 grid grid-cols-2 gap-8 border border-accent-sand/20">
      <div>
        <h5 className="text-base font-bold uppercase tracking-widest text-text-muted mb-4">Library Shortcuts</h5>
        <ul className="space-y-3">
          <li>
            <Link to="/library" className="flex items-center gap-3 text-text-main hover:text-primary transition-colors">
              <Icon name="library_books" size={18} className="text-accent-sage" ariaHidden />
              Library Home
            </Link>
          </li>
          <li>
            <Link to="/library/series" className="flex items-center gap-3 text-text-main hover:text-primary transition-colors">
              <Icon name="collections_bookmark" size={18} className="text-accent-sage" ariaHidden />
              Series Collection
            </Link>
          </li>
          <li>
            <Link to="/library" className="flex items-center gap-3 text-text-main hover:text-primary transition-colors">
              <Icon name="graphic_eq" size={18} className="text-accent-sage" ariaHidden />
              Sermons & Messages
            </Link>
          </li>
          <li>
            <Link to="/library" className="flex items-center gap-3 text-text-main hover:text-primary transition-colors">
              <Icon name="manage_search" size={18} className="text-accent-sage" ariaHidden />
              Browse All Resources
            </Link>
          </li>
        </ul>
        <div className="mt-6">
          <Link 
            to={isLibraryClusterPage ? "/" : "/library"} 
            className="inline-flex items-center gap-2 text-primary font-bold text-base hover:underline underline-offset-4 decoration-2"
          >
            {isLibraryClusterPage ? (
              <>
                <Icon name="arrow_back" size={18} ariaHidden />
                Back to Homepage
              </>
            ) : (
              <>
                Go To Library
                <Icon name="arrow_forward" size={18} ariaHidden />
              </>
            )}
          </Link>
        </div>
      </div>
      <div>
        <h5 className="text-base font-bold uppercase tracking-widest text-text-muted mb-4">Latest Series</h5>
        <div className="space-y-4">
          {latestItems.map((item) => (
            <Link key={item.id} to={item.to} className="flex gap-4 group/item cursor-pointer">
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-accent-sand/20">
                {item.image ? (
                  <img
                    alt={`${item.title} thumbnail`}
                    className="w-full h-full object-cover"
                    src={item.image}
                    loading="lazy"
                    decoding="async"
                    width="64"
                    height="64"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <Icon name="collections_bookmark" size={20} ariaHidden />
                  </div>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight group-hover/item:text-primary">{item.title}</p>
                <p className="text-base text-text-muted mt-1">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});

MegaMenu.displayName = 'MegaMenu';

export default MegaMenu;
