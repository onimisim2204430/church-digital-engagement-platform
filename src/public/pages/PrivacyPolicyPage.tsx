import React, { useEffect, useState } from 'react';
import { PublicLayout } from '../layouts';
import PostContent from '../../components/PostContent';
import { privacyPolicyService, type PrivacyPolicyData } from '../../services/privacyPolicy.service';

const PrivacyPolicyPage: React.FC = () => {
  const [policy, setPolicy] = useState<PrivacyPolicyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await privacyPolicyService.getPublic();
        setPolicy(data);
      } catch (err) {
        console.error('Failed to load privacy policy', err);
        setError('Unable to load privacy policy right now. Please try again shortly.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, []);

  return (
    <PublicLayout>
      <section className="w-full px-6 sm:px-8 py-12 sm:py-16 bg-gradient-to-b from-background-light to-surface">
        <div className="max-w-4xl mx-auto rounded-2xl border border-accent-sand/30 bg-white shadow-sm p-6 sm:p-10">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-9 w-2/5 bg-accent-sand/20 rounded" />
              <div className="h-4 w-3/4 bg-accent-sand/20 rounded" />
              <div className="h-4 w-5/6 bg-accent-sand/10 rounded" />
              <div className="h-4 w-2/3 bg-accent-sand/10 rounded" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-text-main mb-3">Privacy Policy</h1>
              <p className="text-text-muted">{error}</p>
            </div>
          ) : policy ? (
            <article className="space-y-6">
              <header className="border-b border-accent-sand/30 pb-5">
                <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-text-main">
                  {policy.title}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Last updated: {new Date(policy.updated_at).toLocaleDateString()}
                </p>
              </header>
              <PostContent
                content={policy.content}
                className="text-slate-800 [&_h1]:!text-slate-900 [&_h2]:!text-slate-900 [&_h3]:!text-slate-900 [&_h4]:!text-slate-800 [&_h5]:!text-slate-800 [&_h6]:!text-slate-700 [&_p]:!text-slate-700 [&_li]:!text-slate-700 [&_a]:!text-indigo-700"
              />
            </article>
          ) : (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-text-main mb-3">Privacy Policy</h1>
              <p className="text-text-muted">Privacy policy is temporarily unavailable.</p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default PrivacyPolicyPage;
