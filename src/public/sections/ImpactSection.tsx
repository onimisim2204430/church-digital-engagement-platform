import React, { memo } from 'react';

/**
 * ImpactSection Component - Lazy loaded below-fold content
 * Optimized with image lazy loading and proper aspect ratios
 */
const ImpactSection: React.FC = memo(() => {
  return (
    <section className="py-24 px-6 max-w-[1200px] mx-auto border-b border-accent-sand/20" aria-labelledby="impact-heading">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <span className="text-base font-bold tracking-[0.15em] uppercase text-accent-sage mb-4 block">Our Reach</span>
          <h2 id="impact-heading" className="text-5xl lg:text-6xl font-display text-text-main mb-6 leading-tight">
            Quietly changing <br />the world together.
          </h2>
          <p className="text-text-muted text-2xl mb-10 leading-relaxed">
            Our sanctuary extends beyond these digital walls. Through collective generosity, we support communities seeking peace and restoration worldwide.
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-4xl font-display text-primary mb-1">12+</h3>
              <p className="text-base font-bold text-text-muted uppercase tracking-wider">Partner Missions</p>
            </div>
            <div>
              <h3 className="text-4xl font-display text-primary mb-1">2.4k</h3>
              <p className="text-base font-bold text-text-muted uppercase tracking-wider">Lives Restored</p>
            </div>
            <div>
              <h3 className="text-4xl font-display text-primary mb-1">$45k</h3>
              <p className="text-base font-bold text-text-muted uppercase tracking-wider">Impact Grants</p>
            </div>
            <div>
              <h3 className="text-4xl font-display text-primary mb-1">100%</h3>
              <p className="text-base font-bold text-text-muted uppercase tracking-wider">Direct Support</p>
            </div>
          </div>
        </div>
        <div className="relative">
          {/* Aspect ratio container to prevent CLS */}
          <div className="aspect-square bg-[#EBE9E4] rounded-full overflow-hidden p-12">
            <div className="w-full h-full rounded-full overflow-hidden shadow-soft">
              {/* Optimized image with lazy loading and proper dimensions */}
              <img 
                alt="Community members working together in mission partnership" 
                className="w-full h-full object-cover" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi2LEq1qkPBar5edjVCyKRIcm7Q6zWVwxW6BNviiBzLRTTToy7ZB3lYy2LmhqeY_1M4Tm7BiG50qsruqaAWyQJUgixOfrOlFB62jv_K9Tt7DF59WH8SEuqV2fc9dVBmoKY86P1OXgLq9x-Ed1WgdrUMVvFwQk4eW868tCwoeQZzvYOC5EEHCOmMpgP5E3kKKH59Yno9o3V3B1p2M30KPEFp8Sw1Fc7zEzdGt0VVrfjdUUbAwFKiss-M9YcGEoXBvdAeqxmyf5QnqY"
                loading="lazy"
                decoding="async"
                width="600"
                height="600"
              />
            </div>
          </div>
          {/* Testimonial card */}
          <div className="absolute top-0 right-0 bg-surface p-6 rounded-card shadow-hover max-w-[200px]">
            <p className="text-base italic text-text-main leading-relaxed">
              "The support from Serene Sanctuary helped us build a community garden that feeds 40 families."
            </p>
            <p className="text-xs font-bold text-primary mt-3">— Aris, Mission Partner</p>
          </div>
        </div>
      </div>
    </section>
  );
});

ImpactSection.displayName = 'ImpactSection';

export default ImpactSection;
