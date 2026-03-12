/**
 * ConnectPage - Community Connection & Service Opportunities
 * Uses PublicLayout for consistent navigation and footer
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { PublicLayout } from './layouts';
import Icon from '../components/common/Icon';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MinistryCard {
  id: number;
  type: 'group' | 'serve' | 'event';
  category: string;
  title: string;
  description: string;
  image?: string;
  schedule?: string;
  location?: string;
  tags?: string[];
  bgColor?: string;
  icon?: string;
  buttonText?: string;
  isLarge?: boolean;
  date?: string;
}

// â”€â”€â”€ Module-level constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FILTERS = ['All Groups', 'Community', 'Service Teams', 'Kids & Youth', 'Outreach'] as const;

const MINISTRIES: MinistryCard[] = [
  {
    id: 1,
    type: 'group',
    category: 'Community',
    title: 'Young Adults Collective',
    description: 'A space for 18-30s to navigate life, faith, and culture together over good coffee and honest conversation.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwM_l2I-Ip3GJ_uZcX7n04Mb_VChe5MfUvShjPaRrT3LoU5ZRTCGrZtIdrzs6Rrn6IUktTnFJXX9ARovS2SImDgzkM6_XOEShw-k3LvmW-H63fzMeqt5UTAakI-USKypxvlR37fL7mL3np2XuAH2qzI0v3fZQ0C2JSau5fM1yIzP5yf32IOvumyXpUJ--JZBEaigyTPLAWrqja3cQ4JuM-2yFp2E51jLJyqkql3e6g__oOYhYkvF_AlgZHQQpSvx-xcxcHALZHniw',
    schedule: 'Tuesdays @ 7:00 PM',
    location: 'The Loft',
    tags: ['Weekly'],
    isLarge: true,
  },
  {
    id: 2,
    type: 'serve',
    category: 'Serve Team',
    title: 'Hospitality',
    description: 'Create a welcoming atmosphere. Prepare coffee, greet guests, and make everyone feel at home.',
    icon: 'coffee',
    bgColor: 'bg-accent-sand',
    buttonText: 'Join the Team',
  },
  {
    id: 3,
    type: 'group',
    category: 'Study',
    title: 'Morning Prayer',
    description: 'Start your day with intention and community prayer.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5T-mSOba17GjhZf2vlYJT_zR803GswV4IG9KQAZqZgfr-5hk9pr0_IOZtL8-XnISfdyvLR980bSKhH3mSmyA2ClC8DQpu2tQ7ZDAEfSuclZgYVmrue2q4KZuNGEdI1cjl-sT3ttIrJnPadaUlYeFXD3Xw_qPj2Ohg9xeSjn-_l3fr-x0Dpg0jCn1aqAnygeLGLgnHYNwA5xhabpo-1XzWZmnlcNxrrjH3vxjYHXmLXd4shR0S8kOYGsFAb1_iuxfSef5gS2horX8',
    schedule: 'Daily (M-F)',
    location: '6:00 AM â€¢ Online',
    tags: ['Daily'],
  },
  {
    id: 4,
    type: 'serve',
    category: 'Serve',
    title: 'Kids Ministry',
    description: 'Invest in the next generation. We need storytellers, nursery helpers, and check-in assistants.',
    icon: 'volunteer_activism',
    bgColor: 'bg-white',
    buttonText: 'Get Involved',
  },
  {
    id: 5,
    type: 'group',
    category: 'Course',
    title: 'Alpha Course',
    description: 'Explore the basics of the Christian faith in an open, friendly environment.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKbG-C0nqrbSLJjlqgxgxU4tcHxCb-rxivo4aZQHshwvRvf3GzgNOqgAFNpiR0Do36gAka02ioWaCfBl8cKTJPPRILncXyfVH5clX4rdsfrN0UxoZ8wXHx0bQ37i_bDgsLXqMxJ8WdsT4qj5ML0b-yfXZhv7fPgzsOnYQVrVpN-LzymXKKWf5IRc5Lc9zREKL1d_AMJlyQ_kTcSssaFmhCBptdV0UwqdLbA8GGEhQIEXSux7i59EbGThmT6l4mAEJKfBsK2ysWgvM',
    schedule: 'Wednesdays',
    location: '6:30 PM â€¢ Main Hall',
    tags: ['Weekly'],
  },
  {
    id: 6,
    type: 'serve',
    category: 'Serve Team',
    title: 'Worship & Tech',
    description: 'Musicians, audio engineers, and visual artists helping to create an atmosphere of worship.',
    icon: 'music_note',
    bgColor: 'bg-accent-sand',
    buttonText: 'Audition / Join',
  },
  {
    id: 7,
    type: 'event',
    category: 'Upcoming Event',
    title: 'Community Feast',
    description: "A quarterly potluck for the entire congregation. Bring a dish, bring a friend, and let's share a meal together.",
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCL2Mnp3TDj7aKVqlT2-kdpx44wuams-r-dpQjjfF2KAxCdIun9ocUstawDqpQvhMApXWdSPat8yozQ-cYcMAcRz7ncy4t2mbWNtAFkbmwm1a5mQCW9-MWRGoAnpbCjsUA9JsZrVod5C0vbWYUNFTXzn7l5kX_xVbOzQRoYnMfeL1ki_OTmpe5I9fpOAz1djZVIyPrWOrNg2EdYlyVU7j4O-ZqqQrLQ3xA8AFOetbO8d1wLxeeiIBfB2ghLQ3akdwkvtqfviUP4pfQ',
    date: 'Oct 15th @ 5:00 PM',
    buttonText: 'RSVP',
    isLarge: true,
  },
];

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FeaturedGroupCard = memo<{ ministry: MinistryCard }>(({ ministry }) => (
  <div className="group relative flex flex-col md:col-span-2 bg-surface rounded-xl p-6 md:p-8 shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-accent-sand/20">
    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon name="groups" size={144} className="text-accent-sand" ariaHidden />
    </div>
    <div className="flex flex-col md:flex-row gap-6 md:items-center h-full z-10">
      <div className="h-24 w-24 md:h-32 md:w-32 shrink-0 rounded-full overflow-hidden border-4 border-background-light shadow-inner">
        <img
          alt={ministry.title}
          className="h-full w-full object-cover"
          src={ministry.image}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">
            {ministry.category}
          </span>
          {ministry.tags?.map((tag, idx) => (
            <span key={idx} className="text-text-muted text-xs font-medium">{tag}</span>
          ))}
        </div>
        <h3 className="text-2xl md:text-3xl font-display font-medium text-text-main">{ministry.title}</h3>
        <p className="text-text-muted text-sm md:text-base leading-relaxed max-w-md">{ministry.description}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-text-main font-medium">
          <div className="flex items-center gap-1.5">
            <Icon name="schedule" size={18} className="text-primary" ariaHidden />
            <span>{ministry.schedule}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="location_on" size={18} className="text-primary" ariaHidden />
            <span>{ministry.location}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 md:mt-0 md:self-end">
        <button className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
          <Icon name="arrow_forward" size={20} ariaHidden />
        </button>
      </div>
    </div>
  </div>
));

const SandServeCard = memo<{ ministry: MinistryCard }>(({ ministry }) => (
  <div className={`group relative flex flex-col justify-between ${ministry.bgColor} rounded-xl p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden`}>
    <div className="absolute -bottom-8 -right-8 opacity-20 text-text-main rotate-12">
      <Icon name={ministry.icon || 'help'} size={140} ariaHidden />
    </div>
    <div>
      <span className="block text-text-main/70 text-xs font-bold uppercase tracking-widest mb-4">{ministry.category}</span>
      <h3 className="text-2xl font-display font-medium text-text-main mb-2">{ministry.title}</h3>
      <p className="text-text-main/80 text-sm leading-relaxed">{ministry.description}</p>
    </div>
    <div className="mt-8 flex items-center gap-2 text-text-main font-bold text-sm group-hover:gap-3 transition-all">
      <span>{ministry.buttonText}</span>
      <Icon name="arrow_forward" size={18} ariaHidden />
    </div>
  </div>
));

const StandardGroupCard = memo<{ ministry: MinistryCard }>(({ ministry }) => (
  <div className="group flex flex-col bg-surface rounded-xl p-6 shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-accent-sand/20">
    <div className="flex justify-between items-start mb-4">
      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-accent-sand/30">
        <img
          alt={ministry.title}
          className="h-full w-full object-cover"
          src={ministry.image}
          loading="lazy"
          decoding="async"
        />
      </div>
      <span className="px-2.5 py-1 bg-background-light border border-accent-sand/50 text-text-muted text-[10px] font-bold uppercase tracking-wider rounded-full">
        {ministry.category}
      </span>
    </div>
    <h3 className="text-xl font-display font-medium text-text-main mb-1">{ministry.title}</h3>
    <p className="text-text-muted text-sm mb-4 line-clamp-2">{ministry.description}</p>
    <div className="mt-auto flex items-center justify-between pt-4 border-t border-accent-sand/20">
      <div className="flex flex-col text-xs font-medium text-text-muted">
        <span>{ministry.schedule}</span>
        <span>{ministry.location}</span>
      </div>
      <button className="text-primary hover:text-primary/80 transition-colors">
        <Icon name="arrow_forward" size={20} />
      </button>
    </div>
  </div>
));

const OutlinedServeCard = memo<{ ministry: MinistryCard }>(({ ministry }) => (
  <div className="group flex flex-col justify-between bg-white border border-accent-sand rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
    <div>
      <div className="flex items-center justify-between mb-4">
        <Icon name={ministry.icon || 'help'} size={40} className="text-accent-sand group-hover:text-primary transition-colors" ariaHidden />
        <span className="text-text-muted/60 text-xs font-bold uppercase tracking-widest">{ministry.category}</span>
      </div>
      <h3 className="text-xl font-display font-medium text-text-main mb-2">{ministry.title}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{ministry.description}</p>
    </div>
    <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-3 transition-all">
      <span>{ministry.buttonText}</span>
      <Icon name="arrow_forward" size={18} ariaHidden />
    </div>
  </div>
));

const FeaturedEventCard = memo<{ ministry: MinistryCard }>(({ ministry }) => (
  <div className="md:col-span-2 lg:col-span-2 group relative flex flex-col md:flex-row bg-surface rounded-xl overflow-hidden shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-accent-sand/20">
    <div className="relative w-full md:w-2/5 h-48 md:h-auto">
      <img
        alt={ministry.title}
        className="absolute inset-0 w-full h-full object-cover"
        src={ministry.image}
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
    </div>
    <div className="flex-1 p-8 flex flex-col justify-center">
      <span className="text-primary text-xs font-bold uppercase tracking-widest mb-2">{ministry.category}</span>
      <h3 className="text-3xl font-display font-medium text-text-main mb-3">{ministry.title}</h3>
      <p className="text-text-muted text-base leading-relaxed mb-6 max-w-lg">{ministry.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-text-main">
          <Icon name="calendar_month" size={18} className="text-primary" ariaHidden />
          <span>{ministry.date}</span>
        </div>
        <button className="px-5 py-2 rounded-full bg-background-light border border-accent-sand hover:border-primary hover:text-primary transition-colors text-sm font-bold text-text-main">
          {ministry.buttonText}
        </button>
      </div>
    </div>
  </div>
));

const MinistryCardRenderer = memo<{ ministry: MinistryCard }>(({ ministry }) => {
  if (ministry.id === 1) return <FeaturedGroupCard ministry={ministry} />;
  if (ministry.id === 2 || ministry.id === 6) return <SandServeCard ministry={ministry} />;
  if (ministry.id === 3 || ministry.id === 5) return <StandardGroupCard ministry={ministry} />;
  if (ministry.id === 4) return <OutlinedServeCard ministry={ministry} />;
  if (ministry.id === 7) return <FeaturedEventCard ministry={ministry} />;
  return null;
});

// â”€â”€â”€ Page Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ConnectPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All Groups');

  const handleFilterChange = useCallback((filter: string) => setActiveFilter(filter), []);

  // Future: filter ministries based on activeFilter tag mapping
  const visibleMinistries = useMemo(() => MINISTRIES, []);

  return (
    <PublicLayout currentPage="connect">
      <div className="w-full px-4 md:px-12 py-10 md:py-16">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-12">
          {/* Page Header & Filters */}
          <div className="flex flex-col gap-8 md:gap-10">
            <div className="flex flex-col gap-4 max-w-2xl">
              <span className="text-text-muted text-xs font-bold tracking-widest uppercase">Community Life</span>
              <h1 className="text-text-main text-5xl md:text-6xl font-display font-medium leading-[1.1] tracking-tight">
                Connect & Serve
              </h1>
              <p className="text-text-muted text-lg md:text-xl font-display leading-relaxed">
                Find a place to belong and a place to give back. Explore our community groups and service opportunities designed to help you grow.
              </p>
            </div>

            {/* Filter Scroll */}
            <div className="w-full overflow-x-auto no-scrollbar pb-2">
              <div className="flex gap-3 min-w-max">
                {FILTERS.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    className={`flex h-10 items-center justify-center px-6 rounded-full transition-all ${
                      activeFilter === filter
                        ? 'bg-primary text-white shadow-md active:scale-95'
                        : 'bg-white border border-accent-sand/50 text-text-muted hover:text-primary hover:border-primary/30'
                    }`}
                  >
                    <p className="text-sm font-medium">{filter}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Asymmetrical Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
            {visibleMinistries.map((ministry) => (
              <MinistryCardRenderer key={ministry.id} ministry={ministry} />
            ))}
          </div>

          {/* Footer Call to Action */}
          <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
            <div className="w-16 h-px bg-accent-sand"></div>
            <p className="text-text-muted text-lg font-display italic">
              "For where two or three are gathered in my name,<br />there am I among them."
            </p>
            <button className="text-primary font-bold text-sm tracking-wide border-b-2 border-transparent hover:border-primary transition-all pb-0.5">
              Start Your Own Group
            </button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ConnectPage;
