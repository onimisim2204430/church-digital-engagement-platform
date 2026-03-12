/**
 * SeriesDetailManager helper functions
 */

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const getAuthorName = (series: any): string | null => {
  if (typeof series.author === 'object' && series.author) {
    return (series.author as any).full_name || null;
  }
  return series.author_name || null;
};
