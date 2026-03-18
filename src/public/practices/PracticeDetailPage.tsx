import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { PublicLayout } from '../layouts';
import {
  publicSpiritualPracticeService,
  type PublicSpiritualPractice,
} from '../../services/publicSpiritualPractice.service';

const PracticeDetailPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [practice, setPractice] = useState<PublicSpiritualPractice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPractice = async () => {
      try {
        setLoading(true);
        const data = await publicSpiritualPracticeService.getBySlug(slug);
        setPractice(data);
      } catch (error) {
        console.error('Failed to fetch practice detail', error);
        setPractice(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPractice();
    }
  }, [slug]);

  return (
    <PublicLayout currentPage="practices" fullWidth>
      <section className="py-16 md:py-24 bg-accent-sand/10 min-h-[60vh]">
        <div className="max-w-[900px] mx-auto px-6">
          <Link to="/practices" className="inline-flex items-center gap-2 text-text-muted hover:text-primary mb-8">
            <Icon name="arrow_back" size={18} ariaHidden />
            Back to practices
          </Link>

          {loading ? (
            <div className="text-text-muted">Loading practice...</div>
          ) : !practice ? (
            <div className="text-text-muted">Practice not found.</div>
          ) : (
            <article className="bg-surface rounded-card shadow-soft overflow-hidden">
              {practice.cover_image && (
                <img
                  src={practice.cover_image}
                  alt={practice.title}
                  className="w-full h-72 object-cover"
                />
              )}

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`w-10 h-10 rounded-full bg-${practice.accent_color}/10 flex items-center justify-center text-${practice.accent_color}`}
                    aria-hidden="true"
                  >
                    <Icon name={practice.icon_name} size={20} />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-text-muted font-bold">
                    {practice.duration_label}
                  </span>
                </div>

                <h1 className="text-4xl font-serif text-text-main mb-4">{practice.title}</h1>
                <p className="text-xl text-text-muted mb-8">{practice.short_description}</p>

                <div className="prose prose-lg max-w-none text-text-main whitespace-pre-wrap">
                  {practice.full_content || 'Full content will be added soon.'}
                </div>

                {practice.audio_url && (
                  <a
                    href={practice.audio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-primary text-white font-bold hover:opacity-90"
                  >
                    <Icon name="headphones" size={18} />
                    Listen Audio Guide
                  </a>
                )}
              </div>
            </article>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default PracticeDetailPage;
