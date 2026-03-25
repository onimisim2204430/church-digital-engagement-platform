import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import Icon from '../../components/common/Icon';
import paymentService, { MemberPaymentTransaction } from '../../services/payment.service';

const formatMoney = (amount: number, currency: string) => {
  const normalizedCurrency = (currency || 'NGN').toUpperCase();
  const amountMajor = amount / 100;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  }).format(amountMajor);
};

const formatDateTime = (dateValue?: string | null) => {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleString();
};

const statusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return { bg: 'rgba(16,185,129,0.12)', text: '#047857', icon: 'check_circle' };
    case 'FAILED':
      return { bg: 'rgba(239,68,68,0.12)', text: '#b91c1c', icon: 'cancel' };
    case 'PROCESSING':
      return { bg: 'rgba(245,158,11,0.12)', text: '#b45309', icon: 'hourglass_top' };
    case 'PENDING':
      return { bg: 'rgba(59,130,246,0.12)', text: '#1d4ed8', icon: 'schedule' };
    default:
      return { bg: 'rgba(107,114,128,0.12)', text: '#374151', icon: 'help' };
  }
};

const MemberGiving: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<MemberPaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [highlightedPayment, setHighlightedPayment] = useState<string | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  // Get payment ID from URL parameter
  const paymentParam = searchParams.get('payment');

  useEffect(() => {
    let cancelled = false;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await paymentService.getMyTransactions();
        if (!cancelled) {
          setTransactions(response.results || []);
          
          // If payment parameter exists, highlight it
          if (paymentParam) {
            setHighlightedPayment(paymentParam);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          setErrorMessage(error?.response?.data?.message || 'Unable to load your transaction history right now.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchTransactions();

    return () => {
      cancelled = true;
    };
  }, [paymentParam]);

  // Scroll to highlighted row
  useEffect(() => {
    if (highlightedPayment && highlightedRowRef.current && !isLoading) {
      setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Clear highlight after 3 seconds
        setTimeout(() => {
          setHighlightedPayment(null);
        }, 3000);
      }, 300);
    }
  }, [highlightedPayment, isLoading]);

  const summary = useMemo(() => {
    const successCount = transactions.filter((tx) => tx.status === 'SUCCESS').length;
    const failedCount = transactions.filter((tx) => tx.status === 'FAILED').length;
    const processingCount = transactions.filter((tx) => tx.status === 'PROCESSING' || tx.status === 'PENDING').length;
    return { successCount, failedCount, processingCount };
  }, [transactions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--m-s5)' }}>
      <div>
        <h1 style={{
          fontSize: 'var(--m-text-2xl)',
          fontWeight: 'var(--m-w-bold)',
          color: 'var(--m-text-primary)',
          margin: '0 0 var(--m-s2)',
          letterSpacing: 'var(--m-tracking-snug)',
          lineHeight: 'var(--m-lh-snug)',
        }}>
          Giving History
        </h1>
        <p style={{ fontSize: 'var(--m-text-base)', color: 'var(--m-text-secondary)', margin: 0 }}>
          Track your personal giving transactions and their payment status
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--m-s3)', marginBottom: 'var(--m-s4)' }}>
        <div className="m-stat-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--m-s1)' }}>
            <span style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Successful</span>
            <strong style={{ fontSize: 'var(--m-text-2xl)', color: 'var(--m-success-text)', fontWeight: 'var(--m-w-bold)' }}>{summary.successCount}</strong>
          </div>
        </div>
        <div className="m-stat-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--m-s1)' }}>
            <span style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Failed</span>
            <strong style={{ fontSize: 'var(--m-text-2xl)', color: 'var(--m-error-text)', fontWeight: 'var(--m-w-bold)' }}>{summary.failedCount}</strong>
          </div>
        </div>
        <div className="m-stat-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--m-s1)' }}>
            <span style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>In Progress</span>
            <strong style={{ fontSize: 'var(--m-text-2xl)', color: 'var(--m-warning-text)', fontWeight: 'var(--m-w-bold)' }}>{summary.processingCount}</strong>
          </div>
        </div>
      </div>

      <div className="m-card">
        <div className="m-card-header">
          <div>
            <h2 className="m-card-title">My Transactions</h2>
            <p style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', margin: 0 }}>Latest 100 records from your account</p>
          </div>
        </div>
        {isLoading ? (
          <div style={{ padding: 'var(--m-s6)', display: 'flex', flexDirection: 'column', gap: 'var(--m-s3)' }}>
            {[1,2,3].map(i => <div key={i} className="m-skeleton" style={{ height: '48px', borderRadius: 'var(--m-r-md)' }} />)}
          </div>
        ) : errorMessage ? (
          <div className="m-empty">
            <p className="m-empty-title" style={{ color: 'var(--m-error-text)' }}>{errorMessage}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="m-empty">
            <div className="m-empty-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }} aria-hidden="true">receipt_long</span>
            </div>
            <p className="m-empty-title">No transactions yet</p>
            <p className="m-empty-subtitle">When you give, your transactions will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: 'var(--m-surface-2)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Reference</th>
                  <th style={{ textAlign: 'left', padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Method</th>
                  <th style={{ textAlign: 'left', padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--m-tracking-caps)', fontWeight: 'var(--m-w-semibold)' }}>Paid At</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const badge = statusColor(tx.status);
                  const isHighlighted = highlightedPayment &&
                    (tx.id === highlightedPayment || tx.reference === highlightedPayment);
                  return (
                    <tr
                      key={tx.id}
                      ref={isHighlighted ? highlightedRowRef : null}
                      style={{
                        borderTop: '1px solid var(--m-border)',
                        background: isHighlighted ? 'var(--m-success-bg)' : 'transparent',
                        transition: 'background-color var(--m-t-base) var(--m-ease-out)',
                      }}
                    >
                      <td style={{ padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-sm)', color: 'var(--m-text-primary)', fontFamily: 'monospace' }}>{tx.reference}</td>
                      <td style={{ padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-sm)', color: 'var(--m-text-primary)' }}>{formatMoney(tx.amount, tx.currency)}</td>
                      <td style={{ padding: 'var(--m-s3) var(--m-s4)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--m-s2)', padding: '3px var(--m-s2)', borderRadius: 'var(--m-r-full)', background: badge.bg, color: badge.text, fontSize: 'var(--m-text-xs)', fontWeight: 'var(--m-w-semibold)' }}>
                          <Icon name={badge.icon} size={14} ariaHidden />
                          {tx.status_label || tx.status}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-sm)', color: 'var(--m-text-primary)' }}>{tx.payment_method || '—'}</td>
                      <td style={{ padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-sm)', color: 'var(--m-text-secondary)' }}>{formatDateTime(tx.created_at)}</td>
                      <td style={{ padding: 'var(--m-s3) var(--m-s4)', fontSize: 'var(--m-text-sm)', color: 'var(--m-text-secondary)' }}>{formatDateTime(tx.paid_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberGiving;
