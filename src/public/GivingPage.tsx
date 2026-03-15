/**
 * GivingPage - Tithes, Offerings, Fundraising & Project Contributions
 * Uses PublicLayout for consistent navigation and footer
 * Matches design system from ConnectPage, SharedNavigation, and PublicLayout
 */

import React, { memo, useMemo, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PublicLayout } from './layouts';
import Icon from '../components/common/Icon';
import { useAuth } from '../auth/AuthContext';
import paymentService from '../services/payment.service';
import givingService from '../services/giving.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type GivingCategory = 'All' | 'Tithes' | 'Offerings' | 'Projects' | 'Fundraising';

interface GivingOption {
  id: string | number; // Support both UUID strings from backend and legacy number IDs
  category: string;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  bgColor: string;
  suggestedAmounts?: number[];
  goal?: number;
  raised?: number;
  progressPercentage?: number | null;
  deadline?: string;
  isRecurring?: boolean;
  isFeatured?: boolean;
  verse?: string;
  totalDonations?: number;
  donorCount?: number;
  isCompleted?: boolean;
}

// ─── Module-level constants ────────────────────────────────────────────────────

const FILTERS: GivingCategory[] = ['All', 'Tithes', 'Offerings', 'Projects', 'Fundraising'];

const GIVING_OPTIONS: GivingOption[] = [
  {
    id: 1,
    category: 'Tithes',
    title: 'Weekly Tithe',
    description: 'Honour God with the first portion of all you receive. Your faithful giving sustains the ministry, staff, and mission of this community.',
    icon: 'volunteer_activism',
    accentColor: 'primary',
    bgColor: 'bg-primary/5',
    suggestedAmounts: [50, 100, 200, 500],
    isRecurring: true,
    isFeatured: true,
    verse: '"Bring the full tithe into the storehouse." — Malachi 3:10',
  },
  {
    id: 2,
    category: 'Offerings',
    title: 'Worship Offering',
    description: 'A free-will offering given out of gratitude and love — above and beyond the tithe — to support the work of the Spirit among us.',
    icon: 'favorite',
    accentColor: 'accent-sage',
    bgColor: 'bg-accent-sage/10',
    suggestedAmounts: [25, 50, 100, 250],
    isRecurring: false,
  },
  {
    id: 3,
    category: 'Offerings',
    title: 'Benevolence Fund',
    description: 'Support families in crisis within our congregation and surrounding community. Funds go directly to food, rent, and emergency relief.',
    icon: 'groups',
    accentColor: 'primary',
    bgColor: 'bg-surface',
    suggestedAmounts: [20, 50, 100, 200],
    isRecurring: false,
  },
  {
    id: 4,
    category: 'Projects',
    title: 'New Sanctuary Build',
    description: 'Help us build a permanent home for our growing congregation. Every gift brings us one step closer to a space designed for worship, community, and rest.',
    icon: 'church',
    accentColor: 'primary',
    bgColor: 'bg-surface',
    goal: 250000,
    raised: 163400,
    deadline: 'Dec 2025',
    isFeatured: true,
  },
  {
    id: 5,
    category: 'Projects',
    title: 'Media & Technology',
    description: 'Fund professional audio-visual equipment, live streaming infrastructure, and digital tools to reach more people online.',
    icon: 'cast',
    accentColor: 'accent-sand',
    bgColor: 'bg-accent-sand/20',
    goal: 35000,
    raised: 21800,
    deadline: 'Mar 2025',
  },
  {
    id: 6,
    category: 'Fundraising',
    title: 'Youth Camp Scholarship',
    description: 'Send a young person to summer spiritual retreat. Your gift covers registration, transport, and accommodation for a teen who cannot afford it.',
    icon: 'camping',
    accentColor: 'accent-sage',
    bgColor: 'bg-surface',
    goal: 15000,
    raised: 9200,
    deadline: 'June 2025',
  },
  {
    id: 7,
    category: 'Fundraising',
    title: 'Missions Trip — Kenya',
    description: 'Support our team as they travel to Nairobi to partner with local churches in community development, medical outreach, and discipleship.',
    icon: 'flight',
    accentColor: 'primary',
    bgColor: 'bg-surface',
    goal: 48000,
    raised: 31500,
    deadline: 'Aug 2025',
    isFeatured: false,
  },
  {
    id: 8,
    category: 'Offerings',
    title: 'Children\'s Ministry',
    description: 'Equip the next generation with curriculum, learning materials, and trained volunteers. Invest in the faith foundation of our youngest members.',
    icon: 'child_care',
    accentColor: 'accent-sand',
    bgColor: 'bg-accent-sand/10',
    suggestedAmounts: [15, 30, 75, 150],
    isRecurring: true,
  },
];

// ─── Helper ────────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);

const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value.trim());

const getProgressPercent = (raised: number, goal: number): number =>
  Math.min(Math.round((raised / goal) * 100), 100);

const toCategoryLabel = (category: string): string => {
  const mapping: Record<string, string> = {
    tithe: 'Tithes',
    offering: 'Offerings',
    project: 'Projects',
    mission: 'Fundraising',
    seed: 'Fundraising',
    other: 'Offerings',
  };
  return mapping[category] || category;
};

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Featured hero-style tithe/offering card — spans 2 columns */
const FeaturedGivingCard = memo<{ option: GivingOption; onGive: (id: string | number) => void }>(({ option, onGive }) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(option.suggestedAmounts?.[1] ?? null);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  return (
    <div className="md:col-span-2 group relative flex flex-col md:flex-row gap-0 bg-surface rounded-xl overflow-hidden shadow-[0_2px_20px_-12px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)] transition-all duration-300 border border-accent-sand/20">
      {/* Left — content */}
      <div className="flex-1 p-8 md:p-10 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">
              {option.category}
            </span>
            {option.isRecurring && (
              <span className="flex items-center gap-1 text-xs text-text-muted font-medium">
                <Icon name="autorenew" size={12} ariaHidden />
                Recurring available
              </span>
            )}
          </div>
          <h3 className="text-3xl md:text-4xl font-serif font-normal text-text-main tracking-tight mb-2">
            {option.title}
          </h3>
          <p className="text-text-muted text-base leading-relaxed max-w-md">{option.description}</p>
          {option.verse && (
            <p className="mt-4 text-sm font-serif italic text-primary/70 border-l-2 border-primary/20 pl-4">
              {option.verse}
            </p>
          )}
        </div>

        {/* Amount selector */}
        {option.suggestedAmounts && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">Select Amount</span>
            <div className="flex flex-wrap gap-2">
              {option.suggestedAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  className={`h-11 px-5 rounded-btn text-sm font-bold transition-all duration-200 ${
                    selectedAmount === amount && !customAmount
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background-light border border-accent-sand/50 text-text-main hover:border-primary/40'
                  }`}
                >
                  {formatCurrency(amount)}
                </button>
              ))}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">$</span>
                <input
                  type="number"
                  placeholder="Custom"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="h-11 w-28 pl-8 pr-4 rounded-btn border border-accent-sand/50 text-sm font-medium text-text-main bg-background-light focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onGive(option.id)}
            className="flex items-center gap-2 bg-primary text-white h-12 px-8 rounded-btn font-bold text-sm tracking-wide shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300"
          >
            <Icon name="favorite" size={18} ariaHidden />
            Give Now
          </button>
          {option.isRecurring && (
            <button className="flex items-center gap-2 bg-white text-text-main border border-accent-sand h-12 px-6 rounded-btn font-bold text-sm tracking-wide hover:border-primary/40 transition-all duration-300">
              <Icon name="autorenew" size={16} ariaHidden />
              Set Up Recurring
            </button>
          )}
        </div>
      </div>

      {/* Right — decorative accent panel */}
      <div className="relative hidden md:flex w-64 flex-col items-center justify-center bg-primary/5 border-l border-accent-sand/20 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <Icon name="volunteer_activism" size={280} className="absolute -bottom-10 -right-10 text-primary" ariaHidden />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name={option.icon} size={30} className="text-primary" ariaHidden />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Trusted & Secure</p>
          <div className="flex flex-col gap-2 text-xs text-text-muted text-center">
            <div className="flex items-center gap-1.5">
              <Icon name="lock" size={12} className="text-primary" ariaHidden />
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="verified" size={12} className="text-primary" ariaHidden />
              <span>Tax Deductible</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon name="receipt_long" size={12} className="text-primary" ariaHidden />
              <span>Instant Receipt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
FeaturedGivingCard.displayName = 'FeaturedGivingCard';

/** Progress-bar fundraising / project card */
const ProjectFundraisingCard = memo<{ option: GivingOption; onGive: (id: string | number) => void; featured?: boolean }>(({ option, onGive, featured }) => {
  const hasGoal = typeof option.goal === 'number' && option.goal > 0;
  const hasRaised = typeof option.raised === 'number';
  const percent = typeof option.progressPercentage === 'number' && option.progressPercentage >= 0
    ? Math.min(option.progressPercentage, 100)
    : hasGoal && hasRaised
      ? getProgressPercent(option.raised as number, option.goal as number)
      : 0;
  
  const isCompleted = option.isCompleted || percent >= 100;

  return (
    <div className={`${featured ? 'md:col-span-2' : ''} group flex flex-col bg-surface rounded-xl overflow-hidden shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 border border-accent-sand/20`}>
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-accent-sand/20">
        <div
          className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-primary'} transition-all duration-700`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon name={option.icon} size={22} className="text-primary" ariaHidden />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="px-2.5 py-0.5 bg-background-light border border-accent-sand/50 text-text-muted text-[10px] font-bold uppercase tracking-wider rounded-full">
              {option.category}
            </span>
            {option.deadline && (
              <span className="flex items-center gap-1 text-[10px] text-text-muted/60 font-medium">
                <Icon name="schedule" size={10} ariaHidden />
                Goal: {option.deadline}
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-serif font-normal text-text-main mb-1.5">{option.title}</h3>
          <p className="text-text-muted text-sm leading-relaxed line-clamp-3">{option.description}</p>
        </div>

        {/* Progress stats */}
        {hasGoal && hasRaised && (
          <div className="flex flex-col gap-2 mt-auto pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-text-main font-serif">{formatCurrency(option.raised as number)}</span>
              <span className="text-xs text-text-muted">of {formatCurrency(option.goal as number)}</span>
            </div>
            <div className="h-2 w-full bg-accent-sand/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              {isCompleted ? (
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <Icon name="check_circle" size={14} ariaHidden />
                  Completed
                </span>
              ) : (
                <span className="text-xs font-bold text-primary">{percent}% funded</span>
              )}
            </div>
          </div>
        )}

        {isCompleted ? (
          <button
            disabled
            className="mt-2 flex items-center justify-between w-full h-11 px-5 rounded-btn border border-green-200 bg-green-50 text-green-700 font-bold text-sm cursor-not-allowed"
          >
            <span>Goal Reached!</span>
            <Icon name="celebration" size={18} ariaHidden />
          </button>
        ) : (
          <button
            onClick={() => onGive(option.id)}
            className="mt-2 flex items-center justify-between w-full h-11 px-5 rounded-btn border border-primary/20 text-primary font-bold text-sm tracking-wide hover:bg-primary hover:text-white transition-all duration-300 group/btn"
          >
            <span>Contribute</span>
            <Icon name="arrow_forward" size={18} className="group-hover/btn:translate-x-1 transition-transform" ariaHidden />
          </button>
        )}
      </div>
    </div>
  );
});
ProjectFundraisingCard.displayName = 'ProjectFundraisingCard';

/** Simple offering card — icon-forward, sand/white background */
const OfferingCard = memo<{ option: GivingOption; onGive: (id: string | number) => void }>(({ option, onGive }) => (
  <div className={`group relative flex flex-col justify-between ${option.bgColor} rounded-xl p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-accent-sand/20`}>
    <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12">
      <Icon name={option.icon} size={120} ariaHidden />
    </div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-5">
        <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center border border-accent-sand/30">
          <Icon name={option.icon} size={24} className="text-primary" ariaHidden />
        </div>
        <span className="text-text-muted/60 text-[10px] font-bold uppercase tracking-widest">{option.category}</span>
      </div>
      <h3 className="text-xl font-serif font-normal text-text-main mb-2">{option.title}</h3>
      <p className="text-text-muted text-sm leading-relaxed">{option.description}</p>
    </div>
    <div className="relative z-10 mt-6 flex items-center justify-between">
      <div className="flex flex-wrap gap-1.5">
        {option.suggestedAmounts?.slice(0, 2).map((amount) => (
          <span key={amount} className="text-[11px] font-bold text-text-muted/70 bg-white/50 border border-accent-sand/30 rounded-full px-2.5 py-0.5">
            {formatCurrency(amount)}
          </span>
        ))}
        <span className="text-[11px] font-bold text-text-muted/70 bg-white/50 border border-accent-sand/30 rounded-full px-2.5 py-0.5">
          Custom
        </span>
      </div>
      <button
        onClick={() => onGive(option.id)}
        className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md"
        aria-label={`Give to ${option.title}`}
      >
        <Icon name="arrow_forward" size={18} ariaHidden />
      </button>
    </div>
  </div>
));
OfferingCard.displayName = 'OfferingCard';

/** Card renderer — maps option type to the correct card component */
const GivingCardRenderer = memo<{ option: GivingOption; onGive: (id: string | number) => void }>(({ option, onGive }) => {
  // Featured tithe/offering with amount selector
  if (option.isFeatured && !option.goal) {
    return <FeaturedGivingCard option={option} onGive={onGive} />;
  }
  // Featured project with progress bar
  if (option.isFeatured && option.goal) {
    return <ProjectFundraisingCard option={option} onGive={onGive} featured />;
  }
  // Projects & Fundraising with progress bars
  if (option.category === 'Projects' || option.category === 'Fundraising') {
    return <ProjectFundraisingCard option={option} onGive={onGive} />;
  }
  // Offerings & Children's
  return <OfferingCard option={option} onGive={onGive} />;
});
GivingCardRenderer.displayName = 'GivingCardRenderer';

// ─── Giving Modal ─────────────────────────────────────────────────────────────

interface GiveInitPayload {
  email: string;
  amount: number;
  recurring: boolean;
  firstName: string;
  lastName: string;
}

const GivingModal = memo<{
  optionId: string | number | null;
  givingOptions: GivingOption[];
  onClose: () => void;
  onInitializePayment: (payload: GiveInitPayload) => Promise<void>;
  defaultEmail: string;
  lockEmail: boolean;
  defaultFirstName: string;
  defaultLastName: string;
}>(({ optionId, givingOptions, onClose, onInitializePayment, defaultEmail, lockEmail, defaultFirstName, defaultLastName }) => {
  const option = givingOptions.find((o) => o.id === optionId);
  const [step, setStep] = useState<'amount' | 'details'>('amount');
  const [formData, setFormData] = useState(() => ({
    amount: '',
    recurring: false,
    firstName: defaultFirstName,
    lastName: defaultLastName,
    email: defaultEmail,
    isSubmitting: false,
    errorMessage: '',
  }));

  if (!option) return null;

  // Reset form when option changes (derived state computed at render time)
  const isNewOption = !optionId || optionId !== option.id;
  const resetForm = () => {
    setStep('amount');
    setFormData({
      amount: '',
      recurring: false,
      firstName: defaultFirstName,
      lastName: defaultLastName,
      email: defaultEmail,
      isSubmitting: false,
      errorMessage: '',
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Give to ${option.title}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-background-light rounded-2xl shadow-2xl overflow-hidden border border-accent-sand/20 animate-in">
        {/* Top accent */}
        <div className="h-1 w-full bg-primary/30" />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">{option.category}</span>
              <h3 className="text-2xl font-serif font-normal text-text-main mt-1">{option.title}</h3>
            </div>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main transition-colors" aria-label="Close">
              <Icon name="close" size={20} />
            </button>
          </div>

          {step === 'amount' ? (
            <div className="flex flex-col gap-5">
              {/* Suggested amounts */}
              {option.suggestedAmounts && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 block">Quick Select</span>
                  <div className="grid grid-cols-4 gap-2">
                    {option.suggestedAmounts.map((a) => (
                      <button
                        key={a}
                        onClick={() => setFormData(prev => ({ ...prev, amount: String(a) }))}
                        className={`h-11 rounded-btn text-sm font-bold transition-all ${
                          formData.amount === String(a) ? 'bg-primary text-white' : 'bg-accent-sand/10 text-text-main hover:bg-accent-sand/30 border border-accent-sand/30'
                        }`}
                      >
                        {formatCurrency(a)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom amount */}
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 block">Custom Amount</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">₦</span>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full h-12 pl-10 pr-4 rounded-btn border border-accent-sand/50 text-text-main bg-white focus:outline-none focus:border-primary/40 transition-colors text-base"
                  />
                </div>
              </div>

              {/* Recurring toggle */}
              {option.isRecurring && (
                <label className="flex items-center gap-3 p-4 rounded-card border border-accent-sand/30 cursor-pointer hover:border-primary/30 transition-colors">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, recurring: !prev.recurring }))}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${formData.recurring ? 'bg-primary' : 'bg-accent-sand/30'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${formData.recurring ? 'translate-x-4' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">Make this recurring</p>
                    <p className="text-xs text-text-muted">Give automatically each week</p>
                  </div>
                </label>
              )}

              <button
                onClick={() => {
                  if (formData.amount && parseFloat(formData.amount) > 0) {
                    setFormData(prev => ({ ...prev, errorMessage: ''}));
                    setStep('details');
                  }
                }}
                disabled={!formData.amount || parseFloat(formData.amount) <= 0}
                className="h-12 w-full rounded-btn bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-soft hover:shadow-hover"
              >
                Continue →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {formData.errorMessage && (
                <div className="p-3 rounded-card border border-red-300 bg-red-50 text-red-700 text-sm">
                  {formData.errorMessage}
                </div>
              )}
              <div className="p-4 bg-primary/5 rounded-card border border-primary/10 flex items-center justify-between">
                <span className="text-sm font-medium text-text-muted">{option.title}</span>
                <span className="text-xl font-serif font-bold text-primary">{formatCurrency(parseFloat(formData.amount))}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5 block">First Name</label>
                  <input value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} type="text" className="w-full h-11 px-4 rounded-btn border border-accent-sand/50 text-text-main bg-white focus:outline-none focus:border-primary/40 transition-colors text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5 block">Last Name</label>
                  <input value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} type="text" className="w-full h-11 px-4 rounded-btn border border-accent-sand/50 text-text-main bg-white focus:outline-none focus:border-primary/40 transition-colors text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5 block">Email</label>
                <input
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={lockEmail}
                  type="email"
                  className="w-full h-11 px-4 rounded-btn border border-accent-sand/50 text-text-main bg-white focus:outline-none focus:border-primary/40 transition-colors text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                />
                {lockEmail && (
                  <p className="text-[11px] text-text-muted mt-1">Using your account email for secure transaction tracking.</p>
                )}
              </div>
              <div className="p-4 bg-accent-sand/10 rounded-card border border-accent-sand/20 flex items-center gap-3">
                <Icon name="lock" size={18} className="text-text-muted shrink-0" ariaHidden />
                <p className="text-xs text-text-muted">Your payment is secured via Paystack. We never store card details on our servers.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('amount')} className="h-12 flex-1 rounded-btn border border-accent-sand text-text-muted font-bold text-sm hover:border-primary/30 transition-colors">
                  Back
                </button>
                <button
                  onClick={async () => {
                    const parsedAmount = parseFloat(formData.amount);
                    if (!parsedAmount || parsedAmount <= 0) {
                      setFormData(prev => ({ ...prev, errorMessage: 'Please enter a valid amount.' }));
                      return;
                    }
                    if (!isValidEmail(formData.email)) {
                      setFormData(prev => ({ ...prev, errorMessage: 'Please enter a valid email address.' }));
                      return;
                    }

                    setFormData(prev => ({ ...prev, errorMessage: '', isSubmitting: true }));
                    try {
                      await onInitializePayment({
                        email: formData.email.trim(),
                        amount: parsedAmount,
                        recurring: formData.recurring,
                        firstName: formData.firstName.trim(),
                        lastName: formData.lastName.trim(),
                      });
                    } catch (error: any) {
                      const fallback = 'Unable to initialize payment. Please try again.';
                      const message = error?.response?.data?.message || error?.message || fallback;
                      setFormData(prev => ({ ...prev, errorMessage: message }));
                    } finally {
                      setFormData(prev => ({ ...prev, isSubmitting: false }));
                    }
                  }}
                  disabled={formData.isSubmitting}
                  className="h-12 flex-[2] rounded-btn bg-primary text-white font-bold text-sm tracking-wide hover:bg-primary/90 transition-all shadow-soft hover:shadow-hover disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="lock" size={16} ariaHidden />
                    {formData.isSubmitting ? 'Redirecting...' : 'Continue to Paystack'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
GivingModal.displayName = 'GivingModal';

// ─── Page Component ─────────────────────────────────────────────────────────────

const GivingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState<GivingCategory>('All');
  const [activeGivingId, setActiveGivingId] = useState<string | number | null>(null);
  const [givingItems, setGivingItems] = useState<GivingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [verificationState, setVerificationState] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const fetchGivingItems = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const items = await givingService.list();
      // Transform backend data to frontend format
      const transformed: GivingOption[] = items.map(item => ({
        id: item.id,
        category: toCategoryLabel(item.category),
        title: item.title,
        description: item.description,
        icon: item.icon || 'volunteer_activism',
        accentColor: 'primary',
        bgColor: 'bg-surface',
        suggestedAmounts: item.suggested_amounts || [],
        goal: item.goal_amount ?? undefined,
        raised: item.raised_amount ?? undefined,
        progressPercentage: item.progress_percentage ?? null,
        deadline: item.deadline || undefined,
        isRecurring: item.is_recurring_enabled,
        isFeatured: item.is_featured,
        verse: item.verse || undefined,
        totalDonations: item.total_donations ?? undefined,
        donorCount: item.donor_count ?? undefined,
        isCompleted: item.is_completed ?? false,
      }));
      setGivingItems(transformed);
    } catch (error: any) {
      console.error('Failed to fetch giving items:', error);
      setLoadError(error.message || 'Failed to load giving options');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch giving items from API on mount
  useEffect(() => {
    fetchGivingItems();
  }, [fetchGivingItems]);

  const handleFilterChange = useCallback((filter: GivingCategory) => setActiveFilter(filter), []);
  const handleGive = useCallback((id: string | number) => setActiveGivingId(id), []);
  const handleCloseModal = useCallback(() => setActiveGivingId(null), []);

  const handleInitializePayment = useCallback(async ({ email, amount, recurring, firstName, lastName }: GiveInitPayload) => {
    const amountInKobo = Math.round(amount * 100);
    const callbackUrl = `${window.location.origin}/giving`;
    const selectedOption = givingItems.find((option) => option.id === activeGivingId);

    const response = await paymentService.initializePayment({
      email,
      amount: amountInKobo,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata: {
        recurring,
        first_name: firstName,
        last_name: lastName,
        source: 'giving_page',
        giving_option_id: activeGivingId,
        giving_option_title: selectedOption?.title,
        giving_category: selectedOption?.category,
      },
    });

    if (!response.authorization_url) {
      throw new Error('Payment provider did not return an authorization URL.');
    }

    window.location.href = response.authorization_url;
  }, [activeGivingId, givingItems]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (!reference) {
      return;
    }

    let isCancelled = false;

    const verifyPayment = async () => {
      try {
        const response = await paymentService.verifyPayment(reference);
        if (isCancelled) return;

        const status = String(response.payment_status || '').toUpperCase();
        if (status === 'SUCCESS') {
          setVerificationState({
            type: 'success',
            message: `Payment confirmed for reference ${reference}. Thank you for your generosity.`,
          });
          // Refresh giving items so progress bars reflect the new gift
          fetchGivingItems();
        } else if (status === 'PROCESSING' || status === 'PENDING') {
          setVerificationState({
            type: 'warning',
            message: `Payment is still processing for reference ${reference}. Please check back shortly.`,
          });
        } else {
          setVerificationState({
            type: 'error',
            message: `Payment verification returned status: ${status || 'UNKNOWN'}.`,
          });
        }
      } catch (error: any) {
        if (isCancelled) return;
        const message = error?.response?.data?.message || 'Unable to verify payment status right now.';
        setVerificationState({ type: 'error', message });
      }
    };

    verifyPayment();

    window.history.replaceState({}, '', '/giving');

    return () => {
      isCancelled = true;
    };
  }, [location.search]);

  const visibleOptions = useMemo(() => {
    if (activeFilter === 'All') return givingItems;
    return givingItems.filter((o) => o.category === activeFilter || (activeFilter === 'Offerings' && o.category === 'Offerings'));
  }, [activeFilter, givingItems]);

  return (
    <PublicLayout currentPage="connect">
      <div className="pt-6 md:pt-8">
        <div className="w-full px-4 md:px-12 py-10 md:py-16">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-12">

          {verificationState && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                verificationState.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : verificationState.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {verificationState.message}
            </div>
          )}

          {/* ── Page Header ── */}
          <div className="flex flex-col gap-8 md:gap-10">
            <div className="flex flex-col gap-4 max-w-2xl">
              <span className="text-text-muted text-xs font-bold tracking-widest uppercase">Generosity & Stewardship</span>
              <h1 className="text-text-main text-5xl md:text-6xl font-serif font-normal leading-[1.1] tracking-tight">
                Give & Invest
              </h1>
              <p className="text-text-muted text-lg md:text-xl font-display leading-relaxed">
                Every gift — whether a tithe, offering, or project contribution — is an act of worship and trust. 
                Choose how you'd like to participate in what God is doing here.
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

          {/* ── Giving Grid ── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Icon name="hourglass_empty" size={48} className="text-slate-300 animate-pulse" />
              <p className="mt-4 text-text-muted font-semibold">Loading giving options...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Icon name="error" size={48} className="text-red-300" />
              <p className="mt-4 text-text-main font-semibold">Unable to load giving options</p>
              <p className="text-sm text-text-muted mt-2">{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 bg-primary text-white px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Reload Page
              </button>
            </div>
          ) : visibleOptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Icon name="volunteer_activism" size={48} className="text-slate-200" />
              <p className="mt-4 text-text-muted font-semibold">No giving options available</p>
              <p className="text-sm text-text-muted/70 mt-2">Please check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
              {visibleOptions.map((option) => (
                <GivingCardRenderer key={option.id} option={option} onGive={handleGive} />
              ))}
            </div>
          )}

          {/* ── Ways to Give strip ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: 'credit_card', title: 'Card / Bank Transfer', desc: 'Give securely online via credit/debit card or direct bank transfer through Paystack.' },
              { icon: 'qr_code_2', title: 'Scan & Give', desc: 'Use your phone to scan our QR code at any service and give in seconds.' },
              { icon: 'mail', title: 'By Cheque or Cash', desc: 'Place your gift in an envelope at the welcome desk or mail to our church address.' },
            ].map((method) => (
              <div key={method.title} className="flex items-start gap-4 p-6 bg-surface rounded-xl border border-accent-sand/20">
                <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name={method.icon} size={20} className="text-primary" ariaHidden />
                </div>
                <div>
                  <h4 className="text-base font-bold text-text-main mb-1">{method.title}</h4>
                  <p className="text-text-muted text-sm leading-relaxed">{method.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer scripture CTA ── */}
          <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
            <div className="w-16 h-px bg-accent-sand"></div>
            <p className="text-text-muted text-lg font-serif italic max-w-lg">
              "Each of you should give what you have decided in your heart to give,<br />
              not reluctantly or under compulsion, for God loves a cheerful giver."
            </p>
            <span className="text-xs font-bold uppercase tracking-widest text-primary/70">2 Corinthians 9:7</span>
            <button className="text-primary font-bold text-sm tracking-wide border-b-2 border-transparent hover:border-primary transition-all pb-0.5">
              Questions about giving? Contact us →
            </button>
          </div>

        </div>
        </div>
      </div>

      {/* ── Giving Modal ── */}
      {activeGivingId !== null && (
        <GivingModal
          optionId={activeGivingId}
          givingOptions={givingItems}
          onClose={handleCloseModal}
          onInitializePayment={handleInitializePayment}
          defaultEmail={isAuthenticated ? (user?.email || '') : ''}
          lockEmail={Boolean(isAuthenticated && user?.email)}
          defaultFirstName={user?.firstName || ''}
          defaultLastName={user?.lastName || ''}
        />
      )}
    </PublicLayout>
  );
};

export default GivingPage;
