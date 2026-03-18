import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { PublicLayout } from '../layouts';
import {
  publicSpiritualPracticeService,
  type PublicSpiritualPractice,
} from '../../services/publicSpiritualPractice.service';

const PracticesPage: React.FC = () => {
  const [practices, setPractices] = useState<PublicSpiritualPractice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPractices = async () => {
      try {
        setLoading(true);
        const data = await publicSpiritualPracticeService.getAllActive();
        setPractices(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch practices', error);
        setPractices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPractices();
  }, []);

  return (
    <PublicLayout currentPage="practices" fullWidth>
      <section className="py-16 md:py-24 bg-accent-sand/10 min-h-[60vh]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-serif text-text-main mb-4">Spiritual Practices</h1>
          <p className="text-lg text-text-muted mb-10 max-w-2xl">
            Explore guided spiritual rhythms for prayer, reflection, and daily renewal.
          </p>

          {loading ? (
            <div className="text-text-muted">Loading practices...</div>
          ) : practices.length === 0 ? (
            <div className="text-text-muted">No active practices available right now.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {practices.map((practice) => (
                <article
                  key={practice.id}
                  className="bg-surface rounded-card p-6 shadow-soft hover:shadow-hover transition-all group"
                >
                  <div
                    className={`w-12 h-12 rounded-full bg-${practice.accent_color}/10 flex items-center justify-center mb-6 group-hover:bg-${practice.accent_color} group-hover:text-white transition-colors text-${practice.accent_color}`}
                    aria-hidden="true"
                  >
                    <Icon name={practice.icon_name} size={24} />
                  </div>
                  <h2 className="text-2xl font-serif mb-2">{practice.title}</h2>
                  <p className="text-lg text-text-muted mb-6 line-clamp-3">{practice.short_description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-text-muted font-bold">{practice.duration_label}</span>
                    <Link
                      to={`/practices/${practice.slug}`}
                      className="inline-flex items-center gap-1 text-primary font-semibold group-hover:gap-2 transition-all"
                    >
                      Read
                      <Icon name="arrow_forward" size={18} ariaHidden />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default PracticesPage;
