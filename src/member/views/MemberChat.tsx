/**
 * MemberChat — Live Community Chat
 * Fills the member-content-area exactly.
 * Left: conversation list  |  Right: active chat window
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext';
import Icon from '../../components/common/Icon';
import './MemberChat.css';

/* ─── Types ─────────────────────────────────────────────────── */
type Status = 'online' | 'away' | 'offline';

interface Contact {
  id: string;
  name: string;
  role: string;
  status: Status;
  avatar: string;        // initials
  avatarColor: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  isGroup?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  status: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; count: number }[];
}

interface Conversation {
  contactId: string;
  messages: Message[];
}

/* ─── Mock data ─────────────────────────────────────────────── */
const CONTACTS: Contact[] = [
  {
    id: 'c1', name: 'Pastor James Adeyemi', role: 'Lead Pastor',
    status: 'online', avatar: 'JA', avatarColor: '#2268f5',
    lastMessage: 'God bless you, see you Sunday!', lastTime: '2m', unread: 2,
  },
  {
    id: 'c2', name: 'Youth Ministry', role: 'Group · 24 members',
    status: 'online', avatar: 'YM', avatarColor: '#8b5cf6',
    lastMessage: 'David: Friday night is confirmed 🎉', lastTime: '14m', unread: 5, isGroup: true,
  },
  {
    id: 'c3', name: 'Sarah Okonkwo', role: 'Worship Leader',
    status: 'online', avatar: 'SO', avatarColor: '#10b981',
    lastMessage: 'Can you send me the song list?', lastTime: '1h', unread: 0,
  },
  {
    id: 'c4', name: 'Prayer Team', role: 'Group · 12 members',
    status: 'away', avatar: 'PT', avatarColor: '#f43f5e',
    lastMessage: 'Let us meet at 6am tomorrow', lastTime: '3h', unread: 1, isGroup: true,
  },
  {
    id: 'c5', name: 'Emmanuel Bright', role: 'Elder',
    status: 'away', avatar: 'EB', avatarColor: '#f59e0b',
    lastMessage: 'Thank you for the update brother', lastTime: 'Yesterday', unread: 0,
  },
  {
    id: 'c6', name: 'Deaconess Grace', role: 'Women\'s Ministry Lead',
    status: 'offline', avatar: 'DG', avatarColor: '#0ea5e9',
    lastMessage: 'The retreat registration is open', lastTime: 'Yesterday', unread: 0,
  },
  {
    id: 'c7', name: 'Announcement Channel', role: 'Channel · read-only',
    status: 'online', avatar: 'AC', avatarColor: '#6366f1',
    lastMessage: 'Sunday service starts at 10:00 AM', lastTime: 'Mon', unread: 0, isGroup: true,
  },
];

const CONVERSATIONS: Record<string, Message[]> = {
  c1: [
    { id: 'm1', senderId: 'c1', text: 'Good morning! How are you doing today?', time: '9:00 AM', status: 'read' },
    { id: 'm2', senderId: 'me', text: 'Good morning Pastor! I\'m doing well, thank you. Getting ready for Sunday.', time: '9:02 AM', status: 'read' },
    { id: 'm3', senderId: 'c1', text: 'Wonderful! We have a special session planned. Please invite any friends you know.', time: '9:05 AM', status: 'read' },
    { id: 'm4', senderId: 'me', text: 'Of course! I\'ll spread the word. Is there a theme for this Sunday?', time: '9:07 AM', status: 'read' },
    { id: 'm5', senderId: 'c1', text: 'Yes — "Walking in Purpose". We\'ll be diving deep into Jeremiah 29:11. It\'s going to be powerful.', time: '9:10 AM', status: 'read' },
    { id: 'm6', senderId: 'me', text: 'That\'s one of my favourite verses. I\'m really looking forward to it!', time: '9:12 AM', status: 'read', reactions: [{ emoji: '🙏', count: 1 }] },
    { id: 'm7', senderId: 'c1', text: 'God bless you, see you Sunday!', time: '9:15 AM', status: 'read' },
  ],
  c2: [
    { id: 'm1', senderId: 'u_david', text: 'Hey everyone! Who\'s coming to fellowship this Friday?', time: '10:00 AM', status: 'read' },
    { id: 'm2', senderId: 'me', text: 'I\'ll be there! Should I bring anything?', time: '10:05 AM', status: 'read' },
    { id: 'm3', senderId: 'u_amaka', text: 'I\'m coming too! 🙌', time: '10:06 AM', status: 'read' },
    { id: 'm4', senderId: 'u_david', text: 'Just bring yourselves and good energy. We have refreshments covered.', time: '10:10 AM', status: 'read' },
    { id: 'm5', senderId: 'u_david', text: 'Friday night is confirmed 🎉', time: '10:30 AM', status: 'delivered' },
  ],
  c3: [
    { id: 'm1', senderId: 'me', text: 'Hi Sarah! Great worship session last Sunday 🎵', time: 'Yesterday', status: 'read' },
    { id: 'm2', senderId: 'c3', text: 'Thank you so much! The team worked really hard. Glory to God 🙏', time: 'Yesterday', status: 'read' },
    { id: 'm3', senderId: 'c3', text: 'Can you send me the song list for next week?', time: 'Yesterday', status: 'delivered' },
  ],
  c4: [
    { id: 'm1', senderId: 'u_elder', text: 'Brothers and sisters, we have a special prayer request from one of our members.', time: '6:00 AM', status: 'read' },
    { id: 'm2', senderId: 'me', text: 'Praying right now 🙏', time: '6:15 AM', status: 'read' },
    { id: 'm3', senderId: 'u_elder', text: 'Let us meet at 6am tomorrow for extended prayer', time: '8:00 AM', status: 'delivered' },
  ],
  c5: [], c6: [], c7: [],
};

const DATE_LABELS: Record<string, string> = {
  c1: 'Today', c2: 'Today', c3: 'Yesterday', c4: 'Today',
};

/* ─── Sub-components ────────────────────────────────────────── */
const Avatar: React.FC<{
  initials: string; color: string; size?: number;
  status?: Status; showStatus?: boolean;
}> = ({ initials, color, size = 40, status, showStatus }) => (
  <div className="ch-avatar-wrap" style={{ width: size, height: size, flexShrink: 0 }}>
    <div
      className="ch-avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
    {showStatus && status && (
      <span className={`ch-avatar-dot ch-dot-${status}`} />
    )}
  </div>
);

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => (
  <span className={`ch-status-badge ch-dot-${status}`}>
    {status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'}
  </span>
);

/* ═══════════════════════════════════════════════════════════ */
const MemberChat: React.FC = () => {
  const { user } = useAuth();

  const [activeId,    setActiveId]    = useState<string>('c1');
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<'all' | 'online' | 'groups'>('all');
  const [inputText,   setInputText]   = useState('');
  const [messages,    setMessages]    = useState<Record<string, Message[]>>(CONVERSATIONS);
  const [typing,      setTyping]      = useState(false);
  const [showInfo,    setShowInfo]    = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  const activeContact = CONTACTS.find(c => c.id === activeId)!;
  const activeMessages = messages[activeId] ?? [];

  /* scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeId]);

  /* simulate typing indicator */
  useEffect(() => {
    setTyping(false);
    if (activeContact?.status === 'online') {
      const t = setTimeout(() => setTyping(true),  1500);
      const t2 = setTimeout(() => setTyping(false), 4000);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
    return undefined;
  }, [activeId, activeContact]);

  /* mobile: track whether a convo is open (slides sidebar away) */
  const [mobileConvOpen, setMobileConvOpen] = useState(false);

  /* clear unread on open */
  const openConversation = (id: string) => {
    setActiveId(id);
    setShowInfo(false);
    setMobileConvOpen(true);
  };

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;
    const msg: Message = {
      id:       `m${Date.now()}`,
      senderId: 'me',
      text,
      time:     new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status:   'sent',
    };
    setMessages(p => ({ ...p, [activeId]: [...(p[activeId] ?? []), msg] }));
    setInputText('');
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* filter conversations */
  const filtered = CONTACTS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.lastMessage.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true
                      : filter === 'online' ? c.status === 'online'
                      : c.isGroup === true;
    return matchSearch && matchFilter;
  });

  const myInitials = (() => {
    const f = user?.firstName?.charAt(0) ?? '';
    const l = user?.lastName?.charAt(0)  ?? '';
    return (f + l).toUpperCase() || 'ME';
  })();

  const senderName = (senderId: string) => {
    if (senderId === 'me') return null;
    const c = CONTACTS.find(c => c.id === senderId);
    if (c) return c.name.split(' ')[0];
    const names: Record<string, string> = {
      u_david: 'David', u_amaka: 'Amaka', u_elder: 'Elder John',
    };
    return names[senderId] ?? 'Member';
  };

  /* ── Render ── */
  return (
    <div className={`ch-page${mobileConvOpen ? " ch-mobile-chat-open" : ""}`}>

      {/* ══ LEFT PANEL — conversation list ══ */}
      <aside className="ch-sidebar">

        {/* Header */}
        <div className="ch-sidebar-head">
          <div className="ch-sidebar-head-row">
            <h2 className="ch-sidebar-title">Messages</h2>
            <button className="ch-icon-btn" title="New message">
              <Icon name="edit_square" size={18} />
            </button>
          </div>

          {/* Search */}
          <div className="ch-search-wrap">
            <Icon name="search" size={15} className="ch-search-icon" />
            <input
              className="ch-search"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="ch-search-clear" onClick={() => setSearch('')}>
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="ch-filter-tabs">
            {(['all', 'online', 'groups'] as const).map(f => (
              <button
                key={f}
                className={`ch-filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="ch-conv-list">
          {filtered.length === 0 ? (
            <div className="ch-empty-list">
              <Icon name="search_off" size={32} />
              <p>No conversations found</p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                className={`ch-conv-item ${activeId === c.id ? 'active' : ''}`}
                onClick={() => openConversation(c.id)}
              >
                <Avatar
                  initials={c.avatar} color={c.avatarColor}
                  size={44} status={c.status} showStatus
                />
                <div className="ch-conv-body">
                  <div className="ch-conv-top">
                    <span className="ch-conv-name">{c.name}</span>
                    <span className="ch-conv-time">{c.lastTime}</span>
                  </div>
                  <div className="ch-conv-bottom">
                    <span className="ch-conv-last">{c.lastMessage}</span>
                    {c.unread > 0 && (
                      <span className="ch-unread-badge">{c.unread}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ══ RIGHT PANEL — chat window ══ */}
      <div className="ch-main">

        {/* ── Chat header ── */}
        <header className="ch-header">
          {/* Mobile back button */}
          <button
            className="ch-icon-btn ch-mobile-back"
            onClick={() => setMobileConvOpen(false)}
            title="Back"
            style={{ display: 'none' }}
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div className="ch-header-left">
            <Avatar
              initials={activeContact.avatar}
              color={activeContact.avatarColor}
              size={40} status={activeContact.status} showStatus
            />
            <div className="ch-header-info">
              <h3 className="ch-header-name">{activeContact.name}</h3>
              <div className="ch-header-meta">
                {activeContact.isGroup
                  ? <span className="ch-header-role">{activeContact.role}</span>
                  : <>
                      <StatusBadge status={activeContact.status} />
                      <span className="ch-header-role-sep">·</span>
                      <span className="ch-header-role">{activeContact.role}</span>
                    </>
                }
              </div>
            </div>
          </div>

          <div className="ch-header-actions">
            <button className="ch-icon-btn" title="Voice call">
              <Icon name="call" size={18} />
            </button>
            <button className="ch-icon-btn" title="Video call">
              <Icon name="videocam" size={18} />
            </button>
            <button
              className={`ch-icon-btn ${showInfo ? 'active' : ''}`}
              title="Contact info"
              onClick={() => setShowInfo(v => !v)}
            >
              <Icon name="info" size={18} />
            </button>
          </div>
        </header>

        {/* ── Messages + Info panel ── */}
        <div className="ch-body">

          {/* Messages area */}
          <div className="ch-messages-wrap">
            <div className="ch-messages">

              {/* Date label */}
              {DATE_LABELS[activeId] && (
                <div className="ch-date-sep">
                  <span>{DATE_LABELS[activeId]}</span>
                </div>
              )}

              {activeMessages.length === 0 && (
                <div className="ch-no-messages">
                  <div className="ch-no-messages-avatar">
                    <Avatar initials={activeContact.avatar} color={activeContact.avatarColor} size={56} />
                  </div>
                  <p className="ch-no-messages-name">{activeContact.name}</p>
                  <p className="ch-no-messages-hint">No messages yet. Say hello! 👋</p>
                </div>
              )}

              {activeMessages.map((msg, i) => {
                const isMe    = msg.senderId === 'me';
                const showSender = activeContact.isGroup && !isMe &&
                  (i === 0 || activeMessages[i - 1].senderId !== msg.senderId);

                return (
                  <div
                    key={msg.id}
                    className={`ch-msg-row ${isMe ? 'ch-msg-me' : 'ch-msg-them'}`}
                  >
                    {/* Avatar for others in group */}
                    {!isMe && activeContact.isGroup && (
                      <div className="ch-msg-avatar-col">
                        {showSender || i === 0 ? (
                          <Avatar
                            initials={(senderName(msg.senderId) ?? 'M').charAt(0).repeat(2).toUpperCase()}
                            color="#6366f1" size={28}
                          />
                        ) : <div style={{ width: 28 }} />}
                      </div>
                    )}

                    <div className="ch-msg-col">
                      {showSender && (
                        <span className="ch-msg-sender-name">{senderName(msg.senderId)}</span>
                      )}
                      <div className={`ch-bubble ${isMe ? 'ch-bubble-me' : 'ch-bubble-them'}`}>
                        <span className="ch-bubble-text">{msg.text}</span>
                        <div className="ch-bubble-meta">
                          <span className="ch-bubble-time">{msg.time}</span>
                          {isMe && (
                            <Icon
                              name={msg.status === 'read' ? 'done_all' : msg.status === 'delivered' ? 'done_all' : 'done'}
                              size={13}
                              className={`ch-read-icon ${msg.status === 'read' ? 'read' : ''}`}
                            />
                          )}
                        </div>
                      </div>
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="ch-reactions">
                          {msg.reactions.map(r => (
                            <button key={r.emoji} className="ch-reaction">
                              {r.emoji} <span>{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typing && (
                <div className="ch-msg-row ch-msg-them">
                  {activeContact.isGroup && <div style={{ width: 28, flexShrink: 0 }} />}
                  <div className="ch-bubble ch-bubble-them ch-typing-bubble">
                    <span className="ch-typing-dot" />
                    <span className="ch-typing-dot" />
                    <span className="ch-typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input bar ── */}
            <div className="ch-input-bar">
              <div className="ch-input-wrap">
                <button className="ch-input-btn" title="Emoji">
                  <Icon name="sentiment_satisfied" size={20} />
                </button>
                <button className="ch-input-btn" title="Attach file">
                  <Icon name="attach_file" size={20} />
                </button>
                <textarea
                  ref={inputRef}
                  className="ch-input"
                  placeholder={`Message ${activeContact.name.split(' ')[0]}…`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKey}
                  rows={1}
                />
                <button className="ch-input-btn" title="Voice message">
                  <Icon name="mic" size={20} />
                </button>
                <button
                  className={`ch-send-btn ${inputText.trim() ? 'ready' : ''}`}
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  title="Send (Enter)"
                >
                  <Icon name="send" size={18} />
                </button>
              </div>
              <p className="ch-input-hint">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </div>

          {/* ── Info panel (slide in) ── */}
          {showInfo && (
            <aside className="ch-info-panel">
              <div className="ch-info-avatar">
                <Avatar
                  initials={activeContact.avatar}
                  color={activeContact.avatarColor}
                  size={72} status={activeContact.status} showStatus
                />
              </div>
              <h3 className="ch-info-name">{activeContact.name}</h3>
              <StatusBadge status={activeContact.status} />
              <p className="ch-info-role">{activeContact.role}</p>

              <div className="ch-info-actions">
                <button className="ch-info-action-btn">
                  <Icon name="call" size={18} />
                  <span>Call</span>
                </button>
                <button className="ch-info-action-btn">
                  <Icon name="videocam" size={18} />
                  <span>Video</span>
                </button>
                <button className="ch-info-action-btn">
                  <Icon name="person" size={18} />
                  <span>Profile</span>
                </button>
              </div>

              <div className="ch-info-section">
                <p className="ch-info-section-title">Shared Media</p>
                <div className="ch-info-media-grid">
                  {['#2268f5','#10b981','#f59e0b','#ef4444','#8b5cf6','#0ea5e9'].map((c,i) => (
                    <div key={i} className="ch-info-media-thumb" style={{ background: c }} />
                  ))}
                </div>
              </div>

              <div className="ch-info-section">
                <p className="ch-info-section-title">Actions</p>
                <button className="ch-info-link">
                  <Icon name="notifications_off" size={15} /> Mute notifications
                </button>
                <button className="ch-info-link">
                  <Icon name="block" size={15} /> Block contact
                </button>
                <button className="ch-info-link danger">
                  <Icon name="delete" size={15} /> Delete conversation
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberChat;