import React, { memo, useEffect, useMemo, useState } from 'react';
import { PublicLayout } from './layouts';
import Icon from '../components/common/Icon';
import { connectService, type ConnectMinistry } from '../services/connect.service';

interface DisplayCard extends ConnectMinistry {
  uiIndex: number;
}

const fallbackImage = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=800&q=80';

const FeaturedGroupCard = memo<{ ministry: DisplayCard }>(({ ministry }) => (
  <div className="group relative flex flex-col md:col-span-2 bg-surface rounded-xl p-6 md:p-8 shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-accent-sand/20">
    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon name="groups" size={144} className="text-accent-sand" ariaHidden />
    </div>
    <div className="flex flex-col md:flex-row gap-6 md:items-center h-full z-10">
      <div className="h-24 w-24 md:h-32 md:w-32 shrink-0 rounded-full overflow-hidden border-4 border-background-light shadow-inner">
        <img alt={ministry.title} className="h-full w-full object-cover" src={ministry.image_url || fallbackImage} loading="lazy" decoding="async" />
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">
            {ministry.category_label || 'Community'}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-display font-medium text-text-main">{ministry.title}</h3>
        <p className="text-text-muted text-sm md:text-base leading-relaxed max-w-md">{ministry.description}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-text-main font-medium">
          {!!ministry.schedule_label && (
            <div className="flex items-center gap-1.5">
              <Icon name="schedule" size={18} className="text-primary" ariaHidden />
              <span>{ministry.schedule_label}</span>
            </div>
          )}
          {!!ministry.location_label && (
            <div className="flex items-center gap-1.5">
              <Icon name="location_on" size={18} className="text-primary" ariaHidden />
              <span>{ministry.location_label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
));

const SandServeCard = memo<{ ministry: DisplayCard }>(({ ministry }) => (
  <div className="group relative flex flex-col justify-between bg-accent-sand rounded-xl p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden">
    <div className="absolute -bottom-8 -right-8 opacity-20 text-text-main rotate-12">
      <Icon name={ministry.icon_name || 'help'} size={140} ariaHidden />
    </div>
    <div>
      <span className="block text-text-main/70 text-xs font-bold uppercase tracking-widest mb-4">{ministry.category_label || 'Serve Team'}</span>
      <h3 className="text-2xl font-display font-medium text-text-main mb-2">{ministry.title}</h3>
      <p className="text-text-main/80 text-sm leading-relaxed">{ministry.description}</p>
    </div>
    <div className="mt-8 flex items-center gap-2 text-text-main font-bold text-sm group-hover:gap-3 transition-all">
      <span>{ministry.cta_label || 'Join the Team'}</span>
      <Icon name="arrow_forward" size={18} ariaHidden />
    </div>
  </div>
));

const StandardGroupCard = memo<{ ministry: DisplayCard }>(({ ministry }) => (
  <div className="group flex flex-col bg-surface rounded-xl p-6 shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-accent-sand/20">
    <div className="flex justify-between items-start mb-4">
      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-accent-sand/30">
        <img alt={ministry.title} className="h-full w-full object-cover" src={ministry.image_url || fallbackImage} loading="lazy" decoding="async" />
      </div>
      <span className="px-2.5 py-1 bg-background-light border border-accent-sand/50 text-text-muted text-[10px] font-bold uppercase tracking-wider rounded-full">
        {ministry.category_label || 'Group'}
      </span>
    </div>
    <h3 className="text-xl font-display font-medium text-text-main mb-1">{ministry.title}</h3>
    <p className="text-text-muted text-sm mb-4 line-clamp-2">{ministry.description}</p>
    <div className="mt-auto flex items-center justify-between pt-4 border-t border-accent-sand/20">
      <div className="flex flex-col text-xs font-medium text-text-muted">
        <span>{ministry.schedule_label || '-'}</span>
        <span>{ministry.location_label || '-'}</span>
      </div>
      <button className="text-primary hover:text-primary/80 transition-colors" type="button">
        <Icon name="arrow_forward" size={20} />
      </button>
    </div>
  </div>
));

const OutlinedServeCard = memo<{ ministry: DisplayCard }>(({ ministry }) => (
  <div className="group flex flex-col justify-between bg-white border border-accent-sand rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
    <div>
      <div className="flex items-center justify-between mb-4">
        <Icon name={ministry.icon_name || 'help'} size={40} className="text-accent-sand group-hover:text-primary transition-colors" ariaHidden />
        <span className="text-text-muted/60 text-xs font-bold uppercase tracking-widest">{ministry.category_label || 'Serve'}</span>
      </div>
      <h3 className="text-xl font-display font-medium text-text-main mb-2">{ministry.title}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{ministry.description}</p>
    </div>
    <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-3 transition-all">
      <span>{ministry.cta_label || 'Get Involved'}</span>
      <Icon name="arrow_forward" size={18} ariaHidden />
    </div>
  </div>
));

const FeaturedEventCard = memo<{ ministry: DisplayCard }>(({ ministry }) => (
  <div className="md:col-span-2 lg:col-span-2 group relative flex flex-col md:flex-row bg-surface rounded-xl overflow-hidden shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-accent-sand/20">
    <div className="relative w-full md:w-2/5 h-48 md:h-auto">
      <img alt={ministry.title} className="absolute inset-0 w-full h-full object-cover" src={ministry.image_url || fallbackImage} loading="lazy" decoding="async" />
      <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
    </div>
    <div className="flex-1 p-8 flex flex-col justify-center">
      <span className="text-primary text-xs font-bold uppercase tracking-widest mb-2">{ministry.category_label || 'Upcoming Event'}</span>
      <h3 className="text-3xl font-display font-medium text-text-main mb-3">{ministry.title}</h3>
      <p className="text-text-muted text-base leading-relaxed mb-6 max-w-lg">{ministry.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-text-main">
          <Icon name="calendar_month" size={18} className="text-primary" ariaHidden />
          <span>{ministry.date_label || 'Coming soon'}</span>
        </div>
        <button className="px-5 py-2 rounded-full bg-background-light border border-accent-sand hover:border-primary hover:text-primary transition-colors text-sm font-bold text-text-main" type="button">
          {ministry.cta_label || 'Learn More'}
        </button>
      </div>
    </div>
  </div>
));

const MinistryCardRenderer = memo<{ ministry: DisplayCard }>(({ ministry }) => {
  if (ministry.style_variant === 'featured_group') return <FeaturedGroupCard ministry={ministry} />;
  if (ministry.style_variant === 'sand_serve') return <SandServeCard ministry={ministry} />;
  if (ministry.style_variant === 'standard_group') return <StandardGroupCard ministry={ministry} />;
  if (ministry.style_variant === 'outlined_serve') return <OutlinedServeCard ministry={ministry} />;
  if (ministry.style_variant === 'featured_event') return <FeaturedEventCard ministry={ministry} />;

  if (ministry.card_type === 'serve') return <OutlinedServeCard ministry={ministry} />;
  if (ministry.card_type === 'event') return <FeaturedEventCard ministry={ministry} />;
  return <StandardGroupCard ministry={ministry} />;
});

const ConnectPage: React.FC = () => {
  const [cards, setCards] = useState<DisplayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await connectService.getPublicConnectMinistries();
        const mapped = (response.results || []).map((item, index) => ({ ...item, uiIndex: index + 1 }));
        setCards(mapped);
      } catch (err) {
        console.error('Failed to load connect ministries', err);
        setCards([]);
        setError('Could not load connect content right now.');
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, []);

  const hasCards = useMemo(() => cards.length > 0, [cards]);

  return (
    <PublicLayout currentPage="connect">
      <div className="w-full px-4 md:px-12 py-10 md:py-16">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-12">
          <div className="flex flex-col gap-4 max-w-2xl">
            <span className="text-text-muted text-xs font-bold tracking-widest uppercase">Community Life</span>
            <h1 className="text-text-main text-5xl md:text-6xl font-display font-medium leading-[1.1] tracking-tight">
              Connect & Serve
            </h1>
            <p className="text-text-muted text-lg md:text-xl font-display leading-relaxed">
              Find a place to belong and a place to give back. Explore our community groups and service opportunities designed to help you grow.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-text-muted">Loading ministries...</div>
          ) : error ? (
            <div className="py-12 text-center text-red-500">{error}</div>
          ) : !hasCards ? (
            <div className="py-12 text-center text-text-muted">No active ministry cards are available yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
              {cards.map((ministry) => (
                <MinistryCardRenderer key={ministry.id} ministry={ministry} />
              ))}
            </div>
          )}

          <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
            <div className="w-16 h-px bg-accent-sand"></div>
            <p className="text-text-muted text-lg font-display italic">
              "For where two or three are gathered in my name,
              <br />
              there am I among them."
            </p>
            <button className="text-primary font-bold text-sm tracking-wide border-b-2 border-transparent hover:border-primary transition-all pb-0.5" type="button">
              Start Your Own Group
            </button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ConnectPage;
