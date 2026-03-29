import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PublicLayout } from './layouts';
import seriesService from '../services/series.service';

type UnsubscribeState = 'loading' | 'success' | 'error';

const SeriesSubscriptionUnsubscribePage: React.FC = () => {
  const location = useLocation();
  const [state, setState] = useState<UnsubscribeState>('loading');
  const [message, setMessage] = useState('Processing unsubscribe request...');
  const [seriesTitle, setSeriesTitle] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const runUnsubscribe = async () => {
      const token = new URLSearchParams(location.search).get('token');
      if (!token) {
        setState('error');
        setMessage('Missing unsubscribe token. Please use the unsubscribe link from your email.');
        return;
      }

      try {
        const response = await seriesService.unsubscribeByToken(token);
        setState('success');
        setMessage(response.detail || 'You have been unsubscribed successfully.');
        setSeriesTitle(response.series_title || null);
      } catch (error: any) {
        setState('error');
        setMessage(error?.response?.data?.detail || 'Unable to unsubscribe with this link.');
      }
    };

    runUnsubscribe();
  }, [location.search]);

  return (
    <PublicLayout currentPage="series" fullWidth={false}>
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Series Update Preferences</h1>

          {state === 'loading' && (
            <div className="mt-6 flex flex-col gap-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 flex items-center gap-3 text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm font-medium">Applying your preference...</span>
              </div>
            </div>
          )}

          {state === 'success' && (
            <>
              <p className="mt-3 text-sm text-slate-600">{message}</p>
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                You will no longer receive updates for <strong className="font-semibold">{seriesTitle || 'this series'}</strong>. If you change your mind, you can resubscribe from the series page anytime.
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <p className="mt-3 text-sm text-rose-600">{message}</p>
              <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                This unsubscribe link is invalid or has already been used.
              </div>
            </>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/library/series" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
              Browse Series
            </Link>
            <Link to="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Back Home
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default SeriesSubscriptionUnsubscribePage;
