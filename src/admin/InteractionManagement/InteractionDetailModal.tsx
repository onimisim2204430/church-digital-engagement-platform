/**
 * InteractionDetailModal — Editorial Design System
 *
 * A centered modal using the same ink/cream/gold tokens as WeeklyFlowPage.
 * Used when viewing an interaction from outside the moderation table.
 *
 * Layout:
 *   - Fixed overlay with blur backdrop
 *   - Modal card: dark header (date-style box + title + close) + tab strip
 *   - Scrollable body + sticky action footer
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import interactionService, { InteractionDetail } from '../../services/interaction.service';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import Icon from '../../components/common/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalTab = 'detail' | 'respond';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  OPEN:     { label:'Open',     color:'#c9922a', bg:'rgba(212,168,83,0.13)',  border:'rgba(212,168,83,0.42)'  },
  PENDING:  { label:'Pending',  color:'#c9922a', bg:'rgba(212,168,83,0.13)',  border:'rgba(212,168,83,0.42)'  },
  ANSWERED: { label:'Answered', color:'#4a8c6a', bg:'rgba(74,140,106,0.12)',  border:'rgba(74,140,106,0.38)'  },
  REVIEWED: { label:'Reviewed', color:'#4a8c6a', bg:'rgba(74,140,106,0.12)',  border:'rgba(74,140,106,0.38)'  },
  ACTIONED: { label:'Actioned', color:'#4a8c6a', bg:'rgba(74,140,106,0.12)',  border:'rgba(74,140,106,0.38)'  },
  CLOSED:   { label:'Closed',   color:'#8c7c72', bg:'rgba(160,148,140,0.10)', border:'rgba(160,148,140,0.28)' },
};

const TYPE_CFG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  QUESTION: { label:'Question', icon:'help_outline',       color:'#3f88aa', bg:'rgba(100,170,210,0.12)', border:'rgba(100,170,210,0.35)' },
  COMMENT:  { label:'Comment',  icon:'chat_bubble_outline',color:'#6b5f58', bg:'rgba(107,95,88,0.10)',   border:'rgba(107,95,88,0.28)'   },
  FLAGGED:  { label:'Flagged',  icon:'flag',               color:'#b05a3a', bg:'rgba(176,90,58,0.11)',   border:'rgba(176,90,58,0.35)'   },
};

// ─── CSS injection ────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&display=swap');

/* ── Overlay ── */
.idm-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(26,22,20,0.65);
  backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: idmFadeIn .2s ease;
}
@keyframes idmFadeIn { from{opacity:0} to{opacity:1} }

/* ── Modal card ── */
.idm-card {
  --ink:   #1a1614; --ink2: #3d3530; --ink3: #6b5f58;
  --ink4:  #a8998f; --ink5: #d4c9c0;
  --cream: #f7f2ec; --cr2:  #ede6db; --paper: #faf7f2;
  --gold:  #d4a853; --gld2: #b8883a;
  --r: 8px;
  font-family: 'Crimson Pro', Georgia, serif;
  color: var(--ink);
  background: var(--paper);
  border-radius: 16px;
  width: 100%;
  max-width: 620px;
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(26,22,20,0.5);
  animation: idmSlideUp .3s cubic-bezier(.32,1,.56,1);
}
@keyframes idmSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.idm-card *, .idm-card *::before, .idm-card *::after { box-sizing: border-box; }

/* ── Modal header (dark, same as WeeklyFlowPage panel) ── */
.idm-header {
  background: var(--ink);
  flex-shrink: 0;
  position: relative;
}
.idm-header::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:rgba(255,255,255,.07);
}
.idm-header-top {
  display: grid;
  grid-template-columns: 52px 1fr 32px;
  align-items: start;
  gap: 14px;
  padding: 16px 18px 14px;
}

/* Type icon box */
.idm-typebox {
  border-radius: 8px; overflow: hidden; width: 52px;
}
.idm-typebox-top {
  display: block; font-family: 'Crimson Pro', serif;
  font-size: 8px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
  background: var(--gold); color: var(--ink);
  padding: 3px 0 2px; text-align: center; line-height: 1;
  border-radius: 5px 5px 0 0;
}
.idm-typebox-icon {
  background: var(--ink2); display: flex; align-items: center;
  justify-content: center; padding: 8px 0;
  border-radius: 0 0 5px 5px;
}

/* Header info */
.idm-header-info { min-width: 0; padding-top: 2px; }
.idm-header-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 5px;
}
.idm-header-dow {
  font-family: 'Crimson Pro', serif; font-size: 10px; font-weight: 600;
  letter-spacing: .16em; text-transform: uppercase; color: var(--ink4);
}
.idm-header-title {
  font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700;
  color: var(--paper); line-height: 1.25; margin-bottom: 4px;
}
.idm-header-sub {
  font-family: 'Crimson Pro', serif; font-size: 11px; color: var(--ink4);
}

/* Close */
.idm-close {
  width: 28px; height: 28px; border-radius: 50%; margin-top: 2px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
  color: rgba(255,255,255,.5); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .14s; flex-shrink: 0;
}
.idm-close:hover { background: rgba(255,255,255,.18); color: #fff; }

/* Chips */
.idm-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 7px; border-radius: 20px; font-size: 9.5px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase; border: 1px solid;
}
.idm-hidden-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 8.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  padding: 2px 6px; border-radius: 20px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: var(--ink4);
}

/* Tab strip */
.idm-tabs {
  display: flex; background: var(--ink); padding: 0 18px;
  border-bottom: 2px solid rgba(255,255,255,.06);
}
.idm-tab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 8px 8px; font-family: 'Crimson Pro', serif;
  font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.3); background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
  cursor: pointer; transition: all .14s;
}
.idm-tab:hover { color: rgba(255,255,255,.62); }
.idm-tab.on { color: var(--paper); border-bottom-color: var(--gold); }

/* ── Body ── */
.idm-body {
  flex: 1; overflow-y: auto; padding: 20px 22px 12px;
  scrollbar-width: thin; scrollbar-color: var(--ink5) transparent;
  background: var(--paper);
}

/* Section heading */
.idm-sec-title {
  font-family: 'Playfair Display', serif; font-size: 10px; font-weight: 700;
  letter-spacing: .16em; text-transform: uppercase; color: var(--gold);
  margin-bottom: 8px; margin-top: 18px; display: flex; align-items: center; gap: 6px;
}
.idm-sec-title:first-child { margin-top: 0; }
.idm-sec-title::after { content:''; flex:1; height:1px; background:rgba(212,168,83,.2); }

/* Post card */
.idm-post-card {
  background: white; border: 1px solid var(--cr2); border-radius: var(--r);
  padding: 12px 16px; margin-bottom: 4px;
}
.idm-post-title { font-size: 13px; font-weight: 700; color: var(--ink2); margin-bottom: 2px; }
.idm-post-author { font-size: 11px; color: var(--ink4); font-style: italic; }

/* Content block */
.idm-content-block {
  background: white; border: 1px solid var(--cr2); border-radius: var(--r);
  padding: 14px 16px;
  font-family: 'Crimson Pro', serif; font-size: 15px; line-height: 1.78;
  color: var(--ink2); white-space: pre-line;
}

/* Detail info rows */
.idm-info-card {
  background: white; border: 1px solid var(--cr2); border-radius: var(--r); overflow: hidden;
}
.idm-info-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 9px 14px; border-bottom: 1px solid var(--cr2);
}
.idm-info-row:last-child { border-bottom: none; }
.idm-info-key {
  font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase;
  color: var(--ink5); width: 80px; flex-shrink: 0; padding-top: 1px;
}
.idm-info-val { font-size: 13px; color: var(--ink2); flex: 1; }

/* Flag block */
.idm-flag {
  background: rgba(176,90,58,.07); border: 1px solid rgba(176,90,58,.25);
  border-left: 3px solid #b05a3a; border-radius: 0 var(--r) var(--r) 0;
  padding: 12px 16px;
}
.idm-flag-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #b05a3a; margin-bottom: 5px; }
.idm-flag-txt { font-size: 13px; color: #7a3a22; line-height: 1.5; }
.idm-flag-by  { margin-top: 8px; font-size: 11px; color: #a05030; }

/* Replies */
.idm-reply {
  background: rgba(237,230,219,.5); border: 1px solid var(--cr2);
  border-radius: var(--r); padding: 12px 14px; margin-bottom: 8px;
}
.idm-reply-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.idm-reply-name { font-size: 12px; font-weight: 700; color: var(--ink2); }
.idm-reply-date { font-size: 11px; color: var(--ink4); font-style: italic; }
.idm-reply-body { font-family: 'Crimson Pro', serif; font-size: 14px; color: var(--ink3); line-height: 1.65; }

/* Response form */
.idm-field { margin-bottom: 14px; }
.idm-label {
  display: block; font-size: 10px; font-weight: 600; letter-spacing: .1em;
  text-transform: uppercase; color: var(--ink4); margin-bottom: 6px;
}
.idm-ta {
  width: 100%; background: white; border: 1.5px solid var(--cr2); border-radius: 7px;
  padding: 10px 13px; font-family: 'Crimson Pro', serif; font-size: 15px;
  color: var(--ink); outline: none; resize: none;
  transition: border-color .14s, box-shadow .14s;
}
.idm-ta:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212,168,83,.12); }
.idm-ta::placeholder { color: var(--ink5); font-style: italic; }

/* Notices */
.idm-notice {
  background: rgba(168,153,143,.1); border: 1px solid rgba(168,153,143,.25);
  border-radius: 7px; padding: 14px 16px;
  font-size: 13px; color: var(--ink4); font-style: italic; text-align: center;
  line-height: 1.6;
}

/* Alerts */
.idm-ok  { display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:7px; font-size:12px; font-weight:500; margin-bottom:12px; background:rgba(74,140,106,.1); border:1px solid rgba(74,140,106,.3); color:#2d6b48; }
.idm-err { display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:7px; font-size:12px; font-weight:500; margin-bottom:12px; background:rgba(176,90,58,.08); border:1px solid rgba(176,90,58,.25); color:#8c2a20; }

/* Loading / error states */
.idm-center {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 60px 24px; text-align: center;
  background: var(--paper); flex: 1;
}
.idm-center p { font-size: 14px; color: var(--ink4); font-style: italic; margin-top: 12px; }
.idm-center h3 { font-family:'Playfair Display',serif; font-size:16px; color:var(--ink3); margin-bottom:4px; }

/* ── Footer ── */
.idm-footer {
  flex-shrink: 0; background: var(--paper);
  border-top: 1px solid var(--cr2);
  padding: 12px 22px 16px;
  display: flex; flex-wrap: wrap; gap: 7px;
}
.idm-fbtn {
  flex: 1; min-width: 100px; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 14px; border-radius: 7px; font-family: 'Crimson Pro', serif;
  font-size: 12px; font-weight: 700; letter-spacing: .04em; cursor: pointer;
  border: none; transition: all .14s;
}
.idm-fbtn:disabled { opacity: .4; cursor: not-allowed; }
.idm-fbtn-ghost { background: white; border: 1.5px solid var(--cr2); color: var(--ink3); }
.idm-fbtn-ghost:not(:disabled):hover { border-color: var(--ink3); }
.idm-fbtn-warn  { background: rgba(176,90,58,.1); border: 1.5px solid rgba(176,90,58,.3); color: #8c3a1e; }
.idm-fbtn-warn:not(:disabled):hover  { background: rgba(176,90,58,.18); }
.idm-fbtn-gold  { background: var(--gold); border: 1.5px solid var(--gold); color: var(--ink); font-weight: 800; }
.idm-fbtn-gold:not(:disabled):hover  { background: var(--gld2); box-shadow: 0 4px 14px rgba(212,168,83,.44); }
.idm-fbtn-dark  { background: var(--ink); border: 1.5px solid var(--ink); color: var(--paper); }
.idm-fbtn-dark:not(:disabled):hover  { background: var(--ink2); }
.idm-fbtn-full  { flex-basis: 100%; }

@media (max-width: 480px) {
  .idm-overlay { padding: 0; align-items: flex-end; }
  .idm-card { border-radius: 18px 18px 0 0; max-height: 92dvh; max-width: 100%; }
}
`;

let _css = false;
const injectCSS = () => {
  if (_css || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
  _css = true;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtFull = (s: string) =>
  new Date(s).toLocaleString('en-US', { month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });

const fmtAgo = (s: string) => {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return 'Just now';
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
};

// ─── Chip atom ────────────────────────────────────────────────────────────────

const Chip = memo(({ cfg, icon }: { cfg: { label:string; color:string; bg:string; border:string }; icon?: string }) => (
  <span className="idm-chip" style={{ color:cfg.color, background:cfg.bg, borderColor:cfg.border }}>
    {icon && <Icon name={icon} size={9} />}{cfg.label}
  </span>
));
Chip.displayName = 'Chip';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  interactionId: string;
  onClose: () => void;
  onUpdate: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const InteractionDetailModal: React.FC<Props> = ({ interactionId, onClose, onUpdate }) => {
  injectCSS();
  const { user } = useAuth();

  const [interaction, setInteraction] = useState<InteractionDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [tab,         setTab]         = useState<ModalTab>('detail');
  const [reply,       setReply]       = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [ok,          setOk]          = useState('');
  const [err,         setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setInteraction(await interactionService.getById(interactionId)); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to load.'); }
    finally { setLoading(false); }
  }, [interactionId]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<any>, msg: string) => {
    setErr(''); setOk('');
    try { await fn(); setOk(msg); load(); onUpdate(); }
    catch (e: any) { setErr(e?.response?.data?.error || `Failed: ${msg}`); }
  };

  const submitReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    await act(() => interactionService.respond(interactionId, reply), 'Response submitted.');
    setReply(''); setSubmitting(false);
  };

  // Block body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const typeCfg   = interaction ? (TYPE_CFG[interaction.type]    ?? TYPE_CFG.COMMENT)  : null;
  const statusCfg = interaction ? (STATUS_CFG[interaction.status] ?? STATUS_CFG.CLOSED) : null;

  return (
    <div className="idm-overlay" onClick={onClose}>
      <div className="idm-card" onClick={e => e.stopPropagation()}>

        {/* ── Header (always shown, even loading) ── */}
        <div className="idm-header">
          <div className="idm-header-top">
            {/* Type box */}
            <div className="idm-typebox">
              {typeCfg
                ? <>
                    <span className="idm-typebox-top">{typeCfg.label}</span>
                    <div className="idm-typebox-icon">
                      <Icon name={typeCfg.icon} size={18} style={{ color: typeCfg.color }} />
                    </div>
                  </>
                : <div className="idm-typebox-icon" style={{ background:'var(--ink2)', borderRadius:8, padding:'14px 0' }}>
                    <Icon name="forum" size={18} style={{ color:'var(--ink4)' }} />
                  </div>
              }
            </div>

            {/* Info */}
            <div className="idm-header-info">
              {interaction ? (
                <>
                  <div className="idm-header-meta">
                    <span className="idm-header-dow">
                      {new Date(interaction.created_at).toLocaleDateString('en-US',{ weekday:'long' }).toUpperCase()}
                    </span>
                    {statusCfg && <Chip cfg={statusCfg} />}
                    {interaction.is_hidden && (
                      <span className="idm-hidden-badge"><Icon name="visibility_off" size={8} />Hidden</span>
                    )}
                  </div>
                  <div className="idm-header-title">
                    {interaction.user.first_name} {interaction.user.last_name}
                  </div>
                  <div className="idm-header-sub">
                    {interaction.user.email} · {fmtAgo(interaction.created_at)}
                  </div>
                </>
              ) : (
                <div style={{ height:44, display:'flex', alignItems:'center' }}>
                  <div style={{ height:12, width:160, borderRadius:4, background:'rgba(255,255,255,.08)', animation:'idmFadeIn .8s infinite alternate' }} />
                </div>
              )}
            </div>

            <button className="idm-close" onClick={onClose}><Icon name="close" size={14} /></button>
          </div>

          {/* Tabs */}
          {interaction && (
            <div className="idm-tabs">
              <button className={`idm-tab ${tab==='detail'?'on':''}`} onClick={() => setTab('detail')}>
                <Icon name="info" size={12} />Details
              </button>
              <button className={`idm-tab ${tab==='respond'?'on':''}`} onClick={() => setTab('respond')}>
                <Icon name="reply" size={12} />Respond
              </button>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div className="idm-center">
            <Icon name="hourglass_empty" size={28} style={{ color:'var(--ink5)' }} />
            <p>Loading interaction…</p>
          </div>
        ) : error || !interaction ? (
          <div className="idm-center">
            <Icon name="error_outline" size={28} style={{ color:'#b05a3a' }} />
            <h3>Could not load</h3>
            <p>{error || 'Interaction not found.'}</p>
          </div>
        ) : (
          <div className="idm-body">
            {ok  && <div className="idm-ok"><Icon name="check_circle" size={13} />{ok}</div>}
            {err && <div className="idm-err"><Icon name="error_outline" size={13} />{err}</div>}

            {tab === 'detail' && (
              <>
                {/* Post */}
                <div className="idm-sec-title"><Icon name="article" size={11} />Post</div>
                <div className="idm-post-card">
                  <div className="idm-post-title">{interaction.post.title}</div>
                  <div className="idm-post-author">by {interaction.post.author_name}</div>
                </div>

                {/* Content */}
                <div className="idm-sec-title" style={{ marginTop:18 }}><Icon name="chat" size={11} />Message</div>
                <div className="idm-content-block">{interaction.content}</div>

                {/* Flag */}
                {interaction.is_flagged && interaction.flag_reason && (
                  <>
                    <div className="idm-sec-title" style={{ marginTop:18 }}><Icon name="flag" size={11} />Flag Details</div>
                    <div className="idm-flag">
                      <div className="idm-flag-lbl">Reason</div>
                      <div className="idm-flag-txt">{interaction.flag_reason}</div>
                      {interaction.flagged_by && (
                        <div className="idm-flag-by">
                          Flagged by {interaction.flagged_by.email}
                          {interaction.flagged_at ? ` · ${fmtAgo(interaction.flagged_at)}` : ''}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Replies */}
                {interaction.replies && interaction.replies.length > 0 && (
                  <>
                    <div className="idm-sec-title" style={{ marginTop:18 }}>
                      <Icon name="forum" size={11} />Responses ({interaction.replies.length})
                    </div>
                    {interaction.replies.map(r => (
                      <div key={r.id} className="idm-reply">
                        <div className="idm-reply-hd">
                          <span className="idm-reply-name">{r.user.first_name} {r.user.last_name}</span>
                          <span className="idm-reply-date">{fmtAgo(r.created_at)}</span>
                        </div>
                        <div className="idm-reply-body">{r.content}</div>
                      </div>
                    ))}
                  </>
                )}

                {/* Metadata */}
                <div className="idm-sec-title" style={{ marginTop:18 }}><Icon name="info" size={11} />Metadata</div>
                <div className="idm-info-card">
                  {[
                    { k:'Submitted', v: fmtFull(interaction.created_at) },
                    ...(interaction.responded_by ? [
                      { k:'Responded', v: `${interaction.responded_by.email}${interaction.responded_at ? ' · ' + fmtAgo(interaction.responded_at) : ''}` }
                    ] : []),
                  ].map(r => (
                    <div key={r.k} className="idm-info-row">
                      <span className="idm-info-key">{r.k}</span>
                      <span className="idm-info-val">{r.v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'respond' && (
              interaction.can_respond && interaction.status === 'OPEN' ? (
                <div className="idm-field">
                  <label className="idm-label">Your Response</label>
                  <textarea
                    className="idm-ta" rows={8}
                    value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Type your response here…"
                    disabled={submitting}
                  />
                </div>
              ) : (
                <div className="idm-notice">
                  {interaction.status !== 'OPEN'
                    ? `This interaction is ${interaction.status_display?.toLowerCase() ?? 'closed'}. No further responses can be added.`
                    : user?.role === UserRole.MODERATOR
                      ? 'As a moderator, you can only respond to questions on your own posts.'
                      : 'You do not have permission to respond to this interaction.'
                  }
                </div>
              )
            )}
          </div>
        )}

        {/* ── Footer ── */}
        {interaction && (
          <div className="idm-footer">
            {/* Submit response (respond tab) */}
            {tab === 'respond' && interaction.can_respond && interaction.status === 'OPEN' && (
              <button className="idm-fbtn idm-fbtn-gold idm-fbtn-full"
                onClick={submitReply} disabled={submitting || !reply.trim()}>
                <Icon name={submitting ? 'hourglass_empty' : 'send'} size={13} />
                {submitting ? 'Sending…' : 'Submit Response'}
              </button>
            )}

            {/* Close interaction */}
            {interaction.can_respond && interaction.status === 'OPEN' && (
              <button className="idm-fbtn idm-fbtn-dark"
                onClick={() => act(() => interactionService.close(interactionId), 'Interaction closed.')}>
                <Icon name="lock" size={13} />Close
              </button>
            )}

            {/* Admin actions */}
            {user?.role === UserRole.ADMIN && (
              <>
                {interaction.is_flagged && interaction.status === 'PENDING' && (
                  <button className="idm-fbtn idm-fbtn-gold"
                    onClick={() => act(() => interactionService.markReviewed(interactionId), 'Marked as reviewed.')}>
                    <Icon name="check_circle" size={13} />Mark Reviewed
                  </button>
                )}
                <button className="idm-fbtn idm-fbtn-ghost"
                  onClick={() => act(
                    () => interaction.is_hidden ? interactionService.unhide(interactionId) : interactionService.hide(interactionId),
                    interaction.is_hidden ? 'Unhidden.' : 'Hidden from public.'
                  )}>
                  <Icon name={interaction.is_hidden ? 'visibility' : 'visibility_off'} size={13} />
                  {interaction.is_hidden ? 'Unhide' : 'Hide'}
                </button>
              </>
            )}

            {/* Always: close window */}
            <button className="idm-fbtn idm-fbtn-ghost" onClick={onClose}>
              <Icon name="close" size={13} />Close Window
            </button>
          </div>
        )}

        {/* Error state footer */}
        {!loading && (error || !interaction) && (
          <div className="idm-footer">
            <button className="idm-fbtn idm-fbtn-ghost idm-fbtn-full" onClick={onClose}>
              <Icon name="close" size={13} />Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractionDetailModal;