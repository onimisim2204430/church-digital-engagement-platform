/**
 * PostsTab.tsx — restyled to admin design system. All logic preserved.
 */
import React, { useMemo } from 'react';
import { SeriesPost } from '../../../../services/series.service';
import Icon from '../../../../components/common/Icon';
import { fmtDate } from '../helpers/series-detail.helpers';

interface PostsTabProps {
  posts: SeriesPost[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddPost: () => void;
  onSaveOrder: () => void;
  onRemovePost: (postId: string) => void;
  onMovePost: (postId: string, direction: 'up' | 'down') => void;
  onDragStart: (postId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetId: string) => void;
  draggedId: string | null;
  removingId: string | null;
  savingOrder: boolean;
}

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

const PostsTab: React.FC<PostsTabProps> = React.memo(({
  posts, searchTerm, onSearchChange, onAddPost, onSaveOrder,
  onRemovePost, onMovePost, onDragStart, onDragOver, onDrop,
  draggedId, removingId, savingOrder,
}) => {
  const filtered = useMemo(
    () => posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [posts, searchTerm]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 200, flex: '1 1 200px', maxWidth: 300 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
            <Icon name="search" size={15} />
          </span>
          <input
            placeholder="Search posts…"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 8,
              color: 'var(--text-primary)', fontFamily: mono, fontSize: 12, outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--em)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
          />
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onAddPost}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--em)', background: 'var(--emd)',
              color: 'var(--em)', cursor: 'pointer',
              fontFamily: mono, fontSize: 12, fontWeight: 700,
              transition: 'background .14s ease',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,.18)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--emd)')}
          >
            <Icon name="add" size={14} />
            Add Post
          </button>
          <button
            onClick={onSaveOrder}
            disabled={savingOrder}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--em)', color: '#fff',
              fontFamily: mono, fontSize: 12, fontWeight: 700,
              opacity: savingOrder ? .6 : 1,
            }}
          >
            <Icon name={savingOrder ? 'hourglass_empty' : 'save'} size={14} />
            {savingOrder ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="article" size={26} style={{ color: 'var(--text-tertiary)' } as any} />
          </div>
          <p style={{ fontFamily: syne, fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>No posts in this series yet</p>
          <p style={{ fontFamily: mono, fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>Add posts to this series to get started</p>
          <button
            onClick={onAddPost}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8,
              border: '1px solid var(--em)', background: 'var(--emd)', color: 'var(--em)',
              cursor: 'pointer', fontFamily: mono, fontSize: 12, fontWeight: 700,
            }}
          >
            <Icon name="add" size={14} />
            Add Post
          </button>
        </div>
      )}

      {/* Post rows */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filtered.map((post, idx) => (
            <div
              key={post.id}
              draggable
              onDragStart={() => onDragStart(post.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(post.id)}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 10,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                userSelect: 'none', cursor: 'default',
                opacity: draggedId === post.id ? .35 : post.is_published ? 1 : .65,
                transform: draggedId === post.id ? 'scale(.99)' : 'none',
                transition: 'opacity .14s ease, transform .14s ease, border-color .14s ease',
              }}
              onMouseEnter={e => { if (draggedId !== post.id) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; }}
            >
              {/* Drag handle */}
              <div style={{ color: 'var(--text-tertiary)', cursor: 'grab', flexShrink: 0 }}>
                <Icon name="drag_indicator" size={18} />
              </div>

              {/* Up/Down arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button onClick={() => onMovePost(post.id, 'up')} disabled={idx === 0}
                  style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 2, color: 'var(--text-tertiary)', opacity: idx === 0 ? .2 : 1 }}
                  onMouseEnter={e => { if (idx !== 0) (e.currentTarget as HTMLElement).style.color = 'var(--em)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                >
                  <Icon name="keyboard_arrow_up" size={16} />
                </button>
                <button onClick={() => onMovePost(post.id, 'down')} disabled={idx === filtered.length - 1}
                  style={{ background: 'none', border: 'none', cursor: idx === filtered.length - 1 ? 'default' : 'pointer', padding: 2, color: 'var(--text-tertiary)', opacity: idx === filtered.length - 1 ? .2 : 1 }}
                  onMouseEnter={e => { if (idx !== filtered.length - 1) (e.currentTarget as HTMLElement).style.color = 'var(--em)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                >
                  <Icon name="keyboard_arrow_down" size={16} />
                </button>
              </div>

              {/* Thumbnail */}
              <div style={{ width: 38, height: 38, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {post.featured_image
                  ? <img src={post.featured_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Icon name="article" size={16} style={{ color: 'var(--text-tertiary)' } as any} />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Part {idx + 1}: {post.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 3, fontFamily: mono, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  {post.author_name && <span>{post.author_name}</span>}
                  {post.author_name && post.published_at && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)' }} />}
                  {post.published_at && <span>{fmtDate(post.published_at)}</span>}
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                  <span>{(post.views_count || 0).toLocaleString()} views</span>
                  {post.content_type_name && (
                    <>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                      <span>{post.content_type_name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status + remove */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {post.is_published
                  ? <span style={{ padding: '3px 9px', borderRadius: 9999, background: 'rgba(16,185,129,.1)', color: 'var(--em)', border: '1px solid rgba(16,185,129,.25)', fontFamily: mono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Published</span>
                  : <span style={{ padding: '3px 9px', borderRadius: 9999, background: 'var(--bg3)', color: 'var(--text-tertiary)', border: '1px solid var(--border-color)', fontFamily: mono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Draft</span>}
                <button
                  onClick={() => onRemovePost(post.id)}
                  disabled={removingId === post.id}
                  title="Remove from series"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'var(--text-tertiary)', borderRadius: 6, opacity: removingId === post.id ? .5 : 1, transition: 'color .13s ease, background .13s ease' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <Icon name={removingId === post.id ? 'hourglass_empty' : 'delete'} size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PostsTab.displayName = 'PostsTab';
export default PostsTab;