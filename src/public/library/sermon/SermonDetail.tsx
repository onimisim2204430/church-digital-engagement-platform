// SermonDetail.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PublicLayout } from '../../layouts';
import publicContentService, { PublicPost } from '../../../services/publicContent.service';
import Icon from '../../../components/common/Icon';
import DiscussionSection from '../../../components/DiscussionSection';
import defaultBookCover from '../../../assets/default-book-cover.png';

const DEFAULT_BOOK_COVER_IMAGE = defaultBookCover;

interface SermonDetailProps {
  sermonId?: string;
}

const SermonDetail: React.FC<SermonDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'content' | 'transcript' | 'guide'>('content');
  const [post, setPost] = useState<PublicPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSermon = async () => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const sermon = await publicContentService.getPostById(id);
        setPost(sermon);
      } catch (err) {
        console.error('Failed to fetch sermon:', err);
        setError('Failed to load sermon. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSermon();
  }, [id]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Get duration with default
  const getDuration = () => {
    return '<5mins'; // Default until duration_minutes field is added to backend
  };

  const featuredImage = (post?.featured_image || '').trim() || DEFAULT_BOOK_COVER_IMAGE;

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src === DEFAULT_BOOK_COVER_IMAGE) {
      return;
    }
    event.currentTarget.src = DEFAULT_BOOK_COVER_IMAGE;
  };

  if (isLoading) {
    return (
      <PublicLayout currentPage="library">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-graphite">Loading sermon...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !post) {
    return (
      <PublicLayout currentPage="library">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Icon name="error_outline" size={96} className="text-graphite mb-4 block" />
            <p className="text-graphite text-lg">{error || 'Sermon not found'}</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout currentPage="library">
      {/* Image Section */}
      <div className="w-full bg-black relative overflow-hidden h-[260px] md:h-[480px]">
        <img
          alt={post.title}
          className="absolute inset-0 w-full h-full object-cover"
          src={featuredImage}
          onError={handleImageError}
        />
      </div>

        {/* Content Section */}
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-12 md:py-16 flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-10 flex-shrink-0">
            <div className="sticky-sidebar flex flex-col gap-6 text-graphite">
              <button className="hover:text-primary transition-colors" title="Share">
                <Icon name="share" />
              </button>
              <button className="hover:text-primary transition-colors" title="Save">
                <Icon name="bookmark" />
              </button>
              <div className="w-full h-px bg-rule"></div>
              <button className="hover:text-primary transition-colors" title="Download Audio">
                <Icon name="audio_file" />
              </button>
              <button className="hover:text-primary transition-colors" title="Download Notes">
                <Icon name="description" />
              </button>
            </div>
          </aside>

          {/* Article Content */}
          <article className="flex-1 max-w-[720px]">
            <header className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary font-medium text-[12px] uppercase tracking-[1.5px]">
                  {post.series_title || post.content_type_name}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl leading-tight font-normal mb-6 text-ink">{post.title}</h1>
              <div className="flex items-center gap-3 text-graphite font-medium text-[12px] uppercase tracking-[1.5px]">
                <span>{post.author_name}</span>
                <span className="text-rule">•</span>
                <span>{formatDate(post.published_at)}</span>
                <span className="text-rule">•</span>
                <span>{getDuration()}</span>
              </div>
            </header>

            {/* Tabs */}
            <div className="border-b border-rule mb-10 flex gap-8">
              <button 
                onClick={() => setActiveTab('content')}
                className={`pb-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'content' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-graphite hover:text-ink'
                }`}
              >
                Content
              </button>
              <button 
                onClick={() => setActiveTab('transcript')}
                className={`pb-4 text-sm font-medium transition-colors ${
                  activeTab === 'transcript' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-graphite hover:text-ink'
                }`}
              >
                Transcript
              </button>
              <button 
                onClick={() => setActiveTab('guide')}
                className={`pb-4 text-sm font-medium transition-colors ${
                  activeTab === 'guide' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-graphite hover:text-ink'
                }`}
              >
                Discussion Guide
              </button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'content' && (
              <div className="prose prose-lg max-w-none text-ink space-y-6">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </div>
            )}

            {activeTab === 'transcript' && (
              <div className="prose prose-lg max-w-none text-graphite">
                <p className="italic">Full transcript will be available soon.</p>
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="discussion-tab-content">
                <DiscussionSection 
                  postId={id!} 
                  commentsEnabled={post?.comments_enabled !== false} 
                />
              </div>
            )}

            {/* Tags and Next Sermon */}
            <div className="mt-16 pt-8 border-t border-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-rule text-graphite">#Peace</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-rule text-graphite">#Theology</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-rule text-graphite">#Ephesians</span>
              </div>
              <button className="flex items-center gap-2 text-primary font-bold text-[12px] uppercase tracking-widest group">
                Next Sermon
                <Icon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </article>
        </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-rule px-6 py-4 flex justify-between items-center z-50">
        <button className="text-graphite"><Icon name="share" /></button>
        <button className="text-graphite"><Icon name="bookmark" /></button>
        <button className="text-graphite"><Icon name="audio_file" /></button>
        <button className="text-graphite"><Icon name="description" /></button>
      </div>

      <style>{`
        .sticky-sidebar {
          position: sticky;
          top: 120px;
        }
        .hairline-border {
          border: 1px solid #E5E7EB;
        }
        .max-w-article {
          max-width: 65ch;
        }
      `}</style>
    </PublicLayout>
  );
};

export default SermonDetail;
