import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../shared/components/Card';
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
    <>
      <div className="welcome-section-pro">
        <h1 className="welcome-title">Giving History</h1>
        <p className="welcome-subtitle">Track your personal giving transactions and their payment status</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Successful</span>
            <strong style={{ fontSize: '24px', color: '#047857' }}>{summary.successCount}</strong>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Failed</span>
            <strong style={{ fontSize: '24px', color: '#b91c1c' }}>{summary.failedCount}</strong>
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>In Progress</span>
            <strong style={{ fontSize: '24px', color: '#b45309' }}>{summary.processingCount}</strong>
          </div>
        </Card>
      </div>

      <Card title="My Transactions" subtitle="Latest 100 records from your account" padding="none">
        {isLoading ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading transactions...</div>
        ) : errorMessage ? (
          <div style={{ padding: '24px', color: '#b91c1c' }}>{errorMessage}</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>No transactions found yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reference</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Method</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Paid At</th>
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
                        borderTop: '1px solid var(--border-color)',
                        background: isHighlighted ? 'var(--success-50)' : 'transparent',
                        transition: 'background-color 0.3s ease'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{tx.reference}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)' }}>{formatMoney(tx.amount, tx.currency)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: badge.bg, color: badge.text, fontSize: '12px', fontWeight: 600 }}>
                          <Icon name={badge.icon} size={14} ariaHidden />
                          {tx.status_label || tx.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-primary)' }}>{tx.payment_method || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDateTime(tx.created_at)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDateTime(tx.paid_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
};

export default MemberGiving;
