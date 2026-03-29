/**
 * Member Giving — Sanctuary Hardcoded UI
 * Main content conversion from provided reference HTML.
 * Uses existing member shell layout (topbar/sidebar/bottom tabs) unchanged.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Church,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  GraduationCap,
  HandHeart,
  Heart,
  HelpCircle,
  Quote,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import paymentService, {
  type MemberPaymentTransaction,
  type MemberRecurringPlan,
} from '../../services/payment.service';
import './MemberGiving.css';

/* ── Component ────────────────────────────────────────────────── */
const MemberGiving: React.FC = () => {
  const [transactions, setTransactions] = useState<MemberPaymentTransaction[]>([]);
  const [recurringPlans, setRecurringPlans] = useState<MemberRecurringPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecurringLoading, setIsRecurringLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [recurringLoadError, setRecurringLoadError] = useState('');
  const [showAllDonations, setShowAllDonations] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setIsRecurringLoading(true);
      setLoadError('');
      setRecurringLoadError('');
      try {
        const [transactionsResponse, recurringResponse] = await Promise.all([
          paymentService.getMyTransactions(),
          paymentService.getMyRecurringPlans(),
        ]);
        if (!isCancelled) {
          setTransactions(transactionsResponse.results || []);
          setRecurringPlans(recurringResponse.results || []);
        }
      } catch (error: any) {
        if (!isCancelled) {
          const msg = error?.response?.data?.message || 'Unable to load giving records right now.';
          setLoadError(msg);
          setRecurringLoadError(msg);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRecurringLoading(false);
        }
      }
    };

    fetchTransactions();
    return () => { isCancelled = true; };
  }, []);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aTime = new Date(a.paid_at || a.created_at || 0).getTime();
      const bTime = new Date(b.paid_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [transactions]);

  const recentDonations = useMemo(() => {
    return showAllDonations ? sortedTransactions : sortedTransactions.slice(0, 5);
  }, [showAllDonations, sortedTransactions]);

  const hasMoreThanFive = sortedTransactions.length > 5;

  const featuredRecurringPlan = useMemo(() => {
    const activePlan = recurringPlans.find((plan) => plan.status === 'active');
    if (activePlan) return activePlan;
    return recurringPlans[0] || null;
  }, [recurringPlans]);

  const majorAmountFormatter = (amountMinor: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format((amountMinor || 0) / 100);
  };

  const majorAmountWithCurrencyFormatter = (amountMinor: number, currency: string) => {
    const normalizedCurrency = (currency || 'USD').toUpperCase();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format((amountMinor || 0) / 100);
  };

  const formatDonationDate = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMethod = (method?: string | null) => {
    if (!method) return 'Online';
    return method
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
  };

  const formatNextPaymentDate = (iso?: string | null) => {
    if (!iso) return 'Not scheduled';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFrequencyLabel = (plan: MemberRecurringPlan) => {
    if (plan.frequency_label) return plan.frequency_label;
    return plan.frequency
      .replace(/_/g, ' ')
      .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
  };

  const extractDonationTitle = (tx: MemberPaymentTransaction) => {
    const titleFromMeta =
      (tx.metadata?.giving_option_title as string | undefined) ||
      (tx.metadata?.title as string | undefined);
    if (titleFromMeta) return titleFromMeta;

    const categoryFromMeta = (tx.metadata?.giving_category as string | undefined);
    if (categoryFromMeta) {
      return categoryFromMeta
        .replace(/_/g, ' ')
        .replace(/(^|\s)\w/g, (m) => m.toUpperCase());
    }

    return 'General Fund';
  };

  const iconForDonation = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('mission')) {
      return <Globe size={18} strokeWidth={2.2} />;
    }
    if (lower.includes('education') || lower.includes('school') || lower.includes('building')) {
      return <GraduationCap size={18} strokeWidth={2.2} />;
    }
    return <Heart size={18} strokeWidth={2.2} />;
  };

  const currentYear = new Date().getFullYear();
  const yearTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      const date = tx.paid_at || tx.created_at;
      if (!date) return false;
      return new Date(date).getFullYear() === currentYear;
    });
  }, [sortedTransactions, currentYear]);

  const successfulYearTransactions = useMemo(() => {
    return yearTransactions.filter((tx) => tx.status === 'SUCCESS');
  }, [yearTransactions]);

  const heroCurrency =
    successfulYearTransactions[0]?.currency ||
    yearTransactions[0]?.currency ||
    sortedTransactions[0]?.currency ||
    'USD';

  const heroAmountMinor = successfulYearTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <div className="mg-page">
      <section className="mg-hero-wrap">
        <div className="mg-hero-card">
          <div className="mg-hero-art" aria-hidden="true">
            <Church className="mg-hero-art-icon" size={88} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h2 className="mg-hero-kicker">{currentYear} Contributions To Date</h2>
          <div className="mg-hero-amount-row">
            <span className="mg-hero-amount">{showBalance ? majorAmountFormatter(heroAmountMinor) : '••••••••'}</span>
            <span className="mg-hero-currency">{heroCurrency.toUpperCase()}</span>
            <button
              className="mg-balance-visibility-btn"
              type="button"
              aria-label={showBalance ? 'Hide contribution balance' : 'Show contribution balance'}
              onClick={() => setShowBalance((prev) => !prev)}
            >
              {showBalance ? (
                <Eye size={16} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <EyeOff size={16} strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="mg-hero-actions">
            <button className="mg-btn mg-btn-primary" type="button">
              <HandHeart size={18} strokeWidth={2} aria-hidden="true" />
              Give Now
            </button>
            <button className="mg-btn mg-btn-glass" type="button">
              <Download size={18} strokeWidth={2} aria-hidden="true" />
              Annual Statement
            </button>
          </div>
        </div>
      </section>

      <div className="mg-grid">
        <section className="mg-main-lane" aria-label="Recent donations">
          <div className="mg-panel">
            <div className="mg-panel-head">
              <h3 className="mg-panel-title">Recent Donations</h3>
              {hasMoreThanFive && (
                <button
                  className="mg-panel-link"
                  type="button"
                  onClick={() => setShowAllDonations((prev) => !prev)}
                >
                  {showAllDonations ? 'Show Less' : 'View All'} <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="mg-donation-list">
              {isLoading ? (
                <div className="mg-donation-state">Loading donations...</div>
              ) : loadError ? (
                <div className="mg-donation-state mg-donation-state-error">{loadError}</div>
              ) : recentDonations.length === 0 ? (
                <div className="mg-donation-state">No donations yet.</div>
              ) : (
                recentDonations.map((tx) => {
                  const title = extractDonationTitle(tx);
                  const isMission = title.toLowerCase().includes('mission');

                  return (
                    <article className="mg-donation-item" key={tx.id}>
                      <div className="mg-donation-left">
                        <div
                          className={`mg-donation-icon ${isMission ? 'mg-donation-icon-amber' : 'mg-donation-icon-primary'}`}
                          aria-hidden="true"
                        >
                          {iconForDonation(title)}
                        </div>
                        <div>
                          <p className="mg-donation-title">{title}</p>
                          <p className="mg-donation-meta">
                            {formatDonationDate(tx.paid_at || tx.created_at)} • {formatMethod(tx.payment_method)}
                          </p>
                        </div>
                      </div>
                      <div className="mg-donation-right">
                        <p className="mg-donation-amount">{majorAmountWithCurrencyFormatter(tx.amount, tx.currency)}</p>
                        <span className="mg-status-pill">{tx.status_label || tx.status}</span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <aside className="mg-side-lane" aria-label="Recurring and security details">
          <div className="mg-panel mg-panel-recurring">
            <h3 className="mg-panel-title">Recurring Gifts</h3>
            <div className="mg-recurring-card">
              {isRecurringLoading ? (
                <p className="mg-recurring-next">Loading recurring plans...</p>
              ) : recurringLoadError ? (
                <p className="mg-recurring-next">{recurringLoadError}</p>
              ) : !featuredRecurringPlan ? (
                <>
                  <div className="mg-recurring-head">
                    <span className="mg-recurring-tag">No Active Plan</span>
                    <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <p className="mg-recurring-amount">—</p>
                  <p className="mg-recurring-sub">Set up monthly recurring giving to track your next payment.</p>
                  <p className="mg-recurring-next">Next gift: Not scheduled</p>
                </>
              ) : (
                <>
                  <div className="mg-recurring-head">
                    <span className="mg-recurring-tag">{featuredRecurringPlan.status_label} Plan</span>
                    <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <p className="mg-recurring-amount">
                    {majorAmountWithCurrencyFormatter(featuredRecurringPlan.amount, featuredRecurringPlan.currency)}
                  </p>
                  <p className="mg-recurring-sub">
                    {formatFrequencyLabel(featuredRecurringPlan)} • {featuredRecurringPlan.giving_title}
                  </p>
                  <p className="mg-recurring-next">
                    Next gift: {formatNextPaymentDate(featuredRecurringPlan.next_payment_at)}
                  </p>
                </>
              )}
            </div>
            <button className="mg-btn mg-btn-outline" type="button">Recurring Settings</button>
          </div>

          <div className="mg-panel mg-panel-security">
            <div className="mg-security-head">
              <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
              <h4>Secure Giving</h4>
            </div>
            <p className="mg-security-copy">
              Your transactions are protected by industry-standard 256-bit SSL encryption. We do not store full credit card details on our servers.
            </p>
            <div className="mg-security-logos" aria-hidden="true">
              <img alt="Visa" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFDo8xKEW7yHpyPAGazr0GrT4XqUWyGrk5o0fvUSTYMFyvnH8XQiZQirWOldRg8ccUJBe6I-UwNChneuBQsr6aMDz6HwlV9UBif6bRAkjaxoku_RyjEmF5Bu-dWmaMN1yAI_qahL87bGcYmGZLt_ZTZtdFjDAA2FDpSA8HcNUQEglv_0ReVbTlKtIOyxGjD8P6vMSQ4CGClQbIUcd4sP2-5PbyswxF4_-uaJNOxZl0fScwtXprC4zXpmObuic6kK_RIJHvb33Y15w" />
              <img alt="Mastercard" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFregLVKkzxY2NiSI9WxXoKpfwWSQkiEnOm85rQf2BT0CBqBLjuKu0RnXU2BT1zz7zGQ1BAALHJ2UQwOlqtHMr8YeiaMopMEgul0IhdoP2_Vl5jjrWzkz622_ZQwrXvgsOG1ZJyOC9HivPSM0pF8ZM7Ur2BI16HYBEOptbLbdXNvf0k07ErE3QKzCRDi-rBPhtPNOsGaq9_ybM1bf_udC_3_v_GpMhZRYozacCbJMNJOXvicGKMbhtXd43VMwurZdOzLUTxtUf6BE" />
              <img alt="PayPal" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAR5xYZQ7VQK9T9kf3DTgOGjtXPor_pmj5IibX90qiggDIA66UC3HH6E027IUhXB3P-z-3YVa3cCvxjI-c703DNY0HiVXyKyTNXmLiG6mdSjUphr8YtpoulTjhNbkMWt-X7ZmOHV7_KSy03LALSxzBqPBMZpruIxgH0nhYHU8PkDfyWoW6hKc03Jp7X3youmAP5HQYXdtK6G8KmmI5QR4vYZLFmkhJgFrfhmGSsNjZIP03pFOC68ShexTiIXuB1crtaOTSgMOn3BaE" />
            </div>
            <button className="mg-security-link" type="button">
              Privacy &amp; Security Policy <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>

      <section className="mg-quote-wrap" aria-label="Scripture reflection">
        <div className="mg-quote-card">
          <Quote size={34} strokeWidth={2} className="mg-quote-icon" aria-hidden="true" />
          <p className="mg-quote-text">
            "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
          </p>
          <p className="mg-quote-ref">— 2 Corinthians 9:7</p>
        </div>
      </section>

      <button className="mg-help-fab" type="button" aria-label="Open giving help">
        <HelpCircle size={22} strokeWidth={2.1} aria-hidden="true" />
      </button>
    </div>
  );
};

export default MemberGiving;
