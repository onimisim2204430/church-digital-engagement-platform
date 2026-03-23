/**
 * ContactInbox — Admin portal for managing contact form submissions.
 *
 * Features:
 * - Filter by status and category
 * - Search by name/email/subject
 * - View full message details in a drawer
 * - Update status / add admin notes
 * - Reply to sender via email from within the portal
 */

import React, {
  useState, useEffect, useMemo, useCallback, memo,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import contactService, {
  ContactCategory,
  ContactMessageDetail,
  ContactMessageSummary,
  ContactStatus,
  CONTACT_CATEGORIES,
} from '../../services/contact.service';
import Icon from '../../components/common/Icon';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  ContactStatus,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  NEW:         { label: 'New',         dot: '#ef4444', text: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  IN_PROGRESS: { label: 'In Progress', dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  REPLIED:     { label: 'Replied',     dot: '#10b981', text: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
  CLOSED:      { label: 'Closed',      dot: '#9ca3af', text: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' },
};

const CATEGORY_LABEL: Record<ContactCategory, string> = {
  GENERAL:     'General',
  SUPPORT:     'Support',
  PRAYER:      'Prayer',
  TECHNICAL:   'Technical',
  FINANCE:     'Finance',
  PARTNERSHIP: 'Partnership',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const StatusBadge: React.FC<{ status: ContactStatus }> = memo(({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.NEW;
  return (
    <span
      style={{ color: cfg.text, background: cfg.bg, borderColor: cfg.border }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
    >
      <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full" />
      {cfg.label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// ─── Main Component ───────────────────────────────────────────────────────────

const ContactInbox: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<ContactMessageSummary[]>([]);
  const [stats, setStats] = useState<Record<ContactStatus, number>>({
    NEW: 0, IN_PROGRESS: 0, REPLIED: 0, CLOSED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<ContactStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ContactCategory | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactMessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reply composer
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState('');
  const [replyError, setReplyError] = useState('');

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Open message from notification deep-link (?message=<uuid>)
  useEffect(() => {
    const msgId = searchParams.get('message');
    if (msgId) setSelectedId(msgId);
  }, [searchParams]);

  // Load messages
  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [res, statsRes] = await Promise.all([
        contactService.getMessages({
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          search: debouncedSearch || undefined,
        }),
        contactService.getStats(),
      ]);
      setMessages(res.results);
      setStats({
        NEW:         statsRes.by_status.NEW || 0,
        IN_PROGRESS: statsRes.by_status.IN_PROGRESS || 0,
        REPLIED:     statsRes.by_status.REPLIED || 0,
        CLOSED:      statsRes.by_status.CLOSED || 0,
      });
    } catch (e) {
      setError('Failed to load contact messages.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, debouncedSearch]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Load detail when drawer opens
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    setReplySuccess('');
    setReplyError('');
    setReplyText('');
    contactService.getMessage(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  // Handlers
  const handleReply = async () => {
    if (!detail || !replyText.trim()) return;
    setReplying(true);
    setReplyError('');
    setReplySuccess('');
    try {
      await contactService.replyToMessage(detail.id, replyText.trim());
      setReplySuccess('Reply sent successfully. The sender has been notified by email.');
      setReplyText('');
      // Refresh detail
      const updated = await contactService.getMessage(detail.id);
      setDetail(updated);
      loadMessages();
    } catch {
      setReplyError('Failed to send reply. Please try again.');
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (newStatus: ContactStatus) => {
    if (!detail) return;
    setUpdatingStatus(true);
    try {
      const updated = await contactService.updateMessage(detail.id, { status: newStatus });
      setDetail(updated as ContactMessageDetail);
      loadMessages();
    } catch {
      // no-op
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-transparent" style={{ fontFamily: "'Times New Roman', Times, serif", padding: '28px 32px 48px', color: 'var(--admin-text-primary, #0f172a)' }}>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
          Contact Inbox
        </div>
        <div style={{ fontSize: 13, color: 'var(--admin-text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: 5 }}>
          Admin <span style={{ color: '#94a3b8' }}>›</span> Contact Inbox
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {(Object.entries(STATUS_CFG) as [ContactStatus, typeof STATUS_CFG[ContactStatus]][]).map(([st, cfg]) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(statusFilter === st ? '' : st)}
            style={{
              background: statusFilter === st ? cfg.bg : 'var(--admin-bg-primary, #fff)',
              border: `1px solid ${statusFilter === st ? cfg.border : 'var(--admin-border, #e2e8f0)'}`,
              borderRadius: 12,
              padding: '16px 20px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: cfg.text }}>{stats[st]}</div>
            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary, #64748b)', fontWeight: 600, marginTop: 4 }}>
              {cfg.label}
            </div>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{
        background: 'var(--admin-bg-primary, #fff)',
        border: '1px solid var(--admin-border, #e2e8f0)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <input
          type="search"
          placeholder="Search name, email, subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px',
            minWidth: 180,
            padding: '8px 14px',
            border: '1px solid var(--admin-border, #e2e8f0)',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none',
            background: 'var(--admin-bg-secondary, #f8fafc)',
          }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ContactCategory | '')}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--admin-border, #e2e8f0)',
            borderRadius: 8,
            fontSize: 13,
            background: 'var(--admin-bg-secondary, #f8fafc)',
            cursor: 'pointer',
          }}
        >
          <option value="">All Categories</option>
          {CONTACT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContactStatus | '')}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--admin-border, #e2e8f0)',
            borderRadius: 8,
            fontSize: 13,
            background: 'var(--admin-bg-secondary, #f8fafc)',
            cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          {(Object.entries(STATUS_CFG) as [ContactStatus, typeof STATUS_CFG[ContactStatus]][]).map(([st, cfg]) => (
            <option key={st} value={st}>{cfg.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadMessages}
          style={{
            padding: '8px 16px',
            background: 'var(--admin-accent, #4f46e5)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      {error ? (
        <div style={{ padding: 24, color: '#ef4444', textAlign: 'center' }}>{error}</div>
      ) : loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading messages…</div>
      ) : messages.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          No messages match your filters.
        </div>
      ) : (
        <div style={{
          background: 'var(--admin-bg-primary, #fff)',
          border: '1px solid var(--admin-border, #e2e8f0)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border, #e2e8f0)', background: 'var(--admin-bg-secondary, #f8fafc)' }}>
                {['From', 'Category', 'Subject', 'Status', 'Replies', 'Date', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, i) => (
                <tr
                  key={msg.id}
                  style={{
                    borderBottom: i < messages.length - 1 ? '1px solid var(--admin-border, #e2e8f0)' : 'none',
                    background: msg.status === 'NEW' ? 'rgba(239,68,68,0.02)' : undefined,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => setSelectedId(msg.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--admin-bg-secondary, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = msg.status === 'NEW' ? 'rgba(239,68,68,0.02)' : '')}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{msg.sender_name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{msg.sender_email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: '#f1f5f9',
                      color: '#334155',
                    }}>
                      {CATEGORY_LABEL[msg.category] || msg.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.subject}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={msg.status} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: msg.reply_count > 0 ? '#10b981' : '#94a3b8', fontWeight: 700 }}>
                    {msg.reply_count}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {fmtDate(msg.created_at)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedId(msg.id); }}
                      style={{
                        padding: '5px 14px',
                        background: 'var(--admin-accent, #4f46e5)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedId && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          {/* Overlay */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setSelectedId(null)}
          />
          {/* Drawer */}
          <div
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', maxWidth: 580,
              background: '#fff',
              borderLeft: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              fontFamily: "'Times New Roman', Times, serif",
            }}
          >
            {/* Drawer header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Message Detail</div>
              <button type="button" onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748b' }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Loading…
              </div>
            ) : !detail ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                Failed to load message.
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>From</div>
                    <div style={{ fontWeight: 600 }}>{detail.sender_name}</div>
                    <a href={`mailto:${detail.sender_email}`} style={{ color: '#4f46e5', fontSize: 13 }}>{detail.sender_email}</a>
                    {detail.sender_phone && <div style={{ color: '#64748b', fontSize: 12 }}>{detail.sender_phone}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Category</div>
                    <div style={{ fontWeight: 600 }}>{CATEGORY_LABEL[detail.category] || detail.category}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Preferred: {detail.preferred_contact}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</div>
                    <StatusBadge status={detail.status} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Received</div>
                    <div style={{ fontSize: 13 }}>{fmtDate(detail.created_at)}</div>
                  </div>
                </div>

                {/* Subject + Message */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Subject</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{detail.subject}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Message</div>
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '12px 16px', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#334155',
                  }}>
                    {detail.message}
                  </div>
                </div>

                {/* Change status */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Update Status</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(Object.entries(STATUS_CFG) as [ContactStatus, typeof STATUS_CFG[ContactStatus]][]).map(([st, cfg]) => (
                      <button
                        key={st}
                        type="button"
                        disabled={updatingStatus || detail.status === st}
                        onClick={() => handleStatusChange(st)}
                        style={{
                          padding: '5px 14px',
                          border: `1px solid ${cfg.border}`,
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: detail.status === st ? 'default' : 'pointer',
                          color: cfg.text,
                          background: detail.status === st ? cfg.bg : '#fff',
                          opacity: updatingStatus ? 0.6 : 1,
                        }}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Previous replies */}
                {detail.replies.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Previous Replies ({detail.replies.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {detail.replies.map((r) => (
                        <div key={r.id} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: '#065f46' }}>{r.replied_by_name || 'Admin'}</div>
                          <div style={{ whiteSpace: 'pre-wrap', color: '#334155', marginBottom: 6 }}>{r.reply_text}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {fmtDate(r.created_at)} · Email {r.email_sent ? '✓ sent' : '✗ not sent'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply composer */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Reply to {detail.sender_name}
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={5}
                    placeholder="Write your reply here. It will be delivered to the sender's email address."
                    style={{
                      width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                      borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none',
                      fontFamily: 'inherit', lineHeight: 1.6,
                    }}
                  />
                  {replySuccess && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, color: '#065f46', fontSize: 13 }}>
                      {replySuccess}
                    </div>
                  )}
                  {replyError && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: 13 }}>
                      {replyError}
                    </div>
                  )}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setReplyText('')}
                      style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#334155' }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={!replyText.trim() || replying}
                      onClick={handleReply}
                      style={{
                        padding: '8px 20px',
                        background: replying || !replyText.trim() ? '#a5b4fc' : '#4f46e5',
                        color: '#fff', border: 'none', borderRadius: 6, fontSize: 13,
                        fontWeight: 700, cursor: replying || !replyText.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {replying ? (
                        <>
                          <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Icon name="send" size={14} />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ContactInbox;
