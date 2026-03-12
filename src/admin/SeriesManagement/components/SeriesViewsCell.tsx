/**
 * SeriesViewsCell.tsx — restyled to admin design system. Logic preserved.
 */
import React, { useState, useEffect } from 'react';
import seriesService from '../../../services/series.service';
import Icon from '../../../components/common/Icon';

interface SeriesViewsCellProps {
  seriesId: string;
}

const SeriesViewsCell: React.FC<SeriesViewsCellProps> = ({ seriesId }) => {
  const [views,   setViews]   = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    seriesService.getSeriesPosts(seriesId)
      .then((posts: any[]) => {
        if (mounted) setViews(posts.reduce((sum: number, p: any) => sum + (p.views_count || 0), 0));
      })
      .catch(() => { if (mounted) setViews(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [seriesId]);

  if (loading)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)' }}>
        <Icon name="progress_activity" size={12} className="animate-spin" />
        …
      </span>
    );

  return <span>{(views || 0).toLocaleString()} views</span>;
};

export default React.memo(SeriesViewsCell);