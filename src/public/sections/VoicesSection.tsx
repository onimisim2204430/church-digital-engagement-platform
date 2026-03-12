import React, { memo, useMemo } from 'react';

/**
 * VoicesSection Component - Lazy loaded below-fold content
 * Displays community testimonial videos with optimized loading
 */
const VoicesSection: React.FC = memo(() => {
  const voices = useMemo(() => [
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
              key={index} 
              className="group relative overflow-hidden rounded-card aspect-video cursor-pointer"
              aria-label={`${voice.title} - ${voice.name}`}
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
                  <span className="material-symbols-outlined text-white text-3xl" aria-hidden="true">play_arrow</span>
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
