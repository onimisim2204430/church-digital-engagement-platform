import React, { memo, useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon';

interface VoiceCard {
  title: string;
  name: string;
  img: string;
  videoUrl?: string;
}

const MAX_PUBLIC_STORIES = 2;

/**
 * VoicesSection Component - Lazy loaded below-fold content
 * Displays community testimonial videos with optimized loading
 */
const VoicesSection: React.FC = memo(() => {
  const fallbackVoices = useMemo<VoiceCard[]>(() => [
    { 
      title: 'A Journey to Stillness', 
      name: 'James\' Story', 
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbQRlebKrM7_ulJKacCS14CaI51zmgvdyk_Ljqgh7ytXvx7JQ198tbBH7I4o8q52Rhv6-EuXSMxa12EBYNNHsOOeQc3hoyY8iBGgfEetcY2MhJEKkE2Dt99veogy1i_lcLaiQUXwmMWQLPSKYc6IPUS1fQb73L9dapz7ArCuo3iTMnKa_A1nwGcTZ1a47lhA4cVUGGVlWrh42I-W_l4qkXvt_NBH4Tjb6iD1SFiN2W1b8oLL-fZXWNKEruHsmZvhuFMK_pEDyj6-4' 
    },
    { 
      title: 'Found in the Chaos', 
      name: 'Maria\'s Reflection', 
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_0GiwP4BFAbIn7Rm0x4C0uc3VC052VXdrrOlxSoOjENPsk6DaI58tKq_x6tTeaUFqLxRlukC2q71l8fcdHIVVYoC7S9aMWGWXdFJPrbyo4fCACrdl4hmKReYQjo6NAaJbY_JDdQgWuYGSw2PwpvEnM7fExEVgWW_Mz1DTj8tNYzxIprea7LZHkgv-6y0p-PLalzKEMpeQ34okoZGDKV8aBVQebwhivVi0af31shHRXdjU8-FgdZQ97lXkUHetnYm2MFPOZaSPoPo' 
    },
  ], []);

  const [voices, setVoices] = useState<VoiceCard[]>(fallbackVoices);

  useEffect(() => {
    let cancelled = false;

    const mergeWithFallback = (databaseVoices: VoiceCard[]): VoiceCard[] => {
      if (databaseVoices.length >= MAX_PUBLIC_STORIES) {
        return databaseVoices.slice(0, MAX_PUBLIC_STORIES);
      }

      const seenKeys = new Set(databaseVoices.map((item) => `${item.name}::${item.title}`));
      const remainingFallback = fallbackVoices.filter((item) => !seenKeys.has(`${item.name}::${item.title}`));

      return [...databaseVoices, ...remainingFallback].slice(0, MAX_PUBLIC_STORIES);
    };

    const fetchVoices = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/public/testimonials/');
        if (!response.ok) {
          throw new Error('Could not load testimonials');
        }

        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : payload.results || [];

        const normalizedVoices: VoiceCard[] = items
          .filter((item: any) => item?.title && item?.name && item?.thumbnail_image)
          .map((item: any) => ({
            title: item.title,
            name: item.name,
            img: item.thumbnail_image,
            videoUrl: item.video_file || item.video_url || undefined,
          }));

        if (cancelled) {
          return;
        }

        if (!normalizedVoices.length) {
          setVoices(fallbackVoices);
          return;
        }

        setVoices(mergeWithFallback(normalizedVoices));
      } catch (error) {
        if (!cancelled) {
          setVoices(fallbackVoices);
        }
      }
    };

    fetchVoices();

    return () => {
      cancelled = true;
    };
  }, [fallbackVoices]);

  return (
    <section className="py-24 px-6 bg-text-main text-background-light" aria-labelledby="voices-heading">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-accent-sand mb-4 block">Community Stories</span>
          <h2 id="voices-heading" className="text-5xl md:text-6xl font-display">Voices of the Sanctuary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {voices.map((voice, index) => (
            <article 
              key={`${voice.name}-${voice.title}-${index}`}
              className="group relative overflow-hidden rounded-card aspect-video cursor-pointer"
              aria-label={`${voice.title} - ${voice.name}`}
              onClick={() => {
                if (voice.videoUrl) {
                  window.open(voice.videoUrl, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              {/* Aspect ratio container prevents CLS */}
              <div style={{ aspectRatio: '16/9' }}>
                {/* Lazy loaded image with async decoding */}
                <img 
                  alt={`${voice.name} testimonial video thumbnail`}
                  className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                  src={voice.img}
                  loading="lazy"
                  decoding="async"
                  width="640"
                  height="360"
                />
              </div>
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm group-hover:bg-primary group-hover:border-primary transition-all">
                  <Icon name="play_arrow" size={32} className="text-white" ariaHidden />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="font-display text-2xl mb-1">{voice.title}</h3>
                <p className="text-base text-accent-sand uppercase tracking-widest">{voice.name}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
});

VoicesSection.displayName = 'VoicesSection';

export default VoicesSection;
