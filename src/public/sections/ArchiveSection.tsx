import React, { memo, useMemo } from 'react';

/**
 * ArchiveSection Component - Lazy loaded below-fold content
 * Displays latest content from the archive with optimized image loading
 */
const ArchiveSection: React.FC = memo(() => {
  // Memoize archive items to prevent unnecessary recalculations
  const archiveItems = useMemo(() => [
    { 
      title: 'Practicing Silence in a Noisy World',
      desc: 'Why silence isn\'t just the absence of noise, but a presence of its own that we can cultivate daily.',
      date: 'Oct 24, 2023',
      readTime: '3 min read',
      category: 'Article',
      topic: 'Spiritual Formation',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_0GiwP4BFAbIn7Rm0x4C0uc3VC052VXdrrOlxSoOjENPsk6DaI58tKq_x6tTeaUFqLxRlukC2q71l8fcdHIVVYoC7S9aMWGWXdFJPrbyo4fCACrdl4hmKReYQjo6NAaJbY_JDdQgWuYGSw2PwpvEnM7fExEVgWW_Mz1DTj8tNYzxIprea7LZHkgv-6y0p-PLalzKEMpeQ34okoZGDKV8aBVQebwhivVi0af31shHRXdjU8-FgdZQ97lXkUHetnYm2MFPOZaSPoPo'
    },
    {
      title: 'Autumn Community Table',
      desc: 'Join us for an evening of shared food, shared stories, and gratitude as the season changes.',
      date: 'Coming Up',
      readTime: 'Nov 12',
      category: 'Gathering',
      topic: 'Community Life',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi2LEq1qkPBar5edjVCyKRIcm7Q6zWVwxW6BNviiBzLRTTToy7ZB3lYy2LmhqeY_1M4Tm7BiG50qsruqaAWyQJUgixOfrOlFB62jv_K9Tt7DF59WH8SEuqV2fc9dVBmoKY86P1OXgLq9x-Ed1WgdrUMVvFwQk4eW868tCwoeQZzvYOC5EEHCOmMpgP5E3kKKH59Yno9o3V3B1p2M30KPEFp8Sw1Fc7zEzdGt0VVrfjdUUbAwFKiss-M9YcGEoXBvdAeqxmyf5QnqY'
    },
    {
      title: 'The Shepherd\'s Voice',
      desc: 'Learning to distinguish the voice of care from the voice of condemnation in our inner lives.',
      date: 'Oct 17, 2023',
      readTime: 'Psalm 23',
      category: 'Sermon',
      topic: 'Teaching',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAA2nq4s3J1jgEiPNOw6LlxJjveanLeRhCAN-FMVpgJUgbnOCsvvtFwUq5YnDiFgpF3BUf8_CKjMcUZDX5KE0bIGcNvB9viHCZri7WLKAalRc0p4j3PvgEaozH0ztWhpZKmsbrXktPUoboM3o7ClEGhRV9s7sGz3cgBX1o8OB8iRYGbfkKZc45Uv8CiuFy2YRhcjOSNM3X4_LXrpWcVS3LKobd9oXd22kMpQqtJSu33MlK0DYsRdRs0nYcJkec4JwplBbaOBrioVIw'
    },
  ], []);

  return (
    <section className="py-20 px-6 max-w-[1200px] mx-auto" aria-labelledby="archive-heading">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
        <div>
          <h2 id="archive-heading" className="text-4xl font-display text-text-main mb-2">Latest from the Archive</h2>
          <p className="text-text-muted text-lg">Nourishment for your week.</p>
        </div>
        <a 
          href="#" 
          className="text-text-muted hover:text-primary text-lg font-medium transition-colors border-b border-transparent hover:border-primary pb-0.5"
          aria-label="View full content library"
        >
          View Full Library
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {archiveItems.map((item, index) => (
          <article 
            key={index} 
            className="group flex flex-col bg-surface rounded-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft cursor-pointer"
          >
            {/* Aspect ratio container prevents CLS */}
            <div 
              className="relative aspect-video w-full overflow-hidden rounded-xl mb-5 bg-accent-sand/20"
              style={{ aspectRatio: '16/9' }}
            >
              {/* Optimized image with lazy loading */}
              <img 
                alt={`${item.title} - ${item.category}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                src={item.img}
                loading="lazy"
                decoding="async"
                width="400"
                height="225"
              />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-text-main">
                {item.category}
              </div>
            </div>
            <div className="flex flex-col flex-grow px-2 pb-2">
              <div className="flex items-center justify-between mb-3 text-base text-text-muted">
                <time dateTime={item.date}>{item.date}</time>
                <span>{item.readTime}</span>
              </div>
              <h3 className="text-2xl font-display font-semibold text-text-main mb-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-lg text-text-muted line-clamp-2 mb-4">
                {item.desc}
              </p>
              <div className="mt-auto pt-4 border-t border-accent-sand/30 flex items-center text-base font-medium text-text-muted">
                <span>{item.topic}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});

ArchiveSection.displayName = 'ArchiveSection';

export default ArchiveSection;
