/**
 * PostForm.tsx — Unified Create / Edit post editor
 *
 * Single file replaces both PostCreate.tsx and PostEdit.tsx.
 * No SacredScrollCanvas dependency.
 * Fully responsive: mobile → tablet → desktop.
 *
 * Usage:
 *   <PostForm />                          // create mode
 *   <PostForm mode="edit" postId="…" />   // edit mode (data pre-filled)
 *   <PostForm draftId="…" />              // resume draft
 *   <PostForm initialData={…} />          // seed from object
 */

import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  PlusCircle, Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Quote, Code, Undo, Redo,
  Heading, ChevronDown, Link, Image, Table,
  SeparatorHorizontal, BookOpen, Heart, Megaphone,
  Eye, FileDown, FileCode, Subscript, Superscript,
  Weight, Space, AlignVerticalJustifyCenter, ArrowLeftRight,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  SigmaSquare, Layers, FileCheck, LayoutTemplate, Palette,
  Languages, Mic, Keyboard, Rocket, Calendar, Trash2,
  Type, Highlighter, CaseSensitive, Sparkles, WrapText,
  Columns2, Columns3, Columns4, CheckSquare, Info,
  Terminal, FileText, Video, Search, X, MoreHorizontal,
  Save, ChevronLeft, ChevronRight, Menu, PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import postService from '../../services/post.service';
import draftService from '../../services/draft.service';
import seriesService from '../../services/series.service';
import ImageUploadInput from './components/ImageUploadInput';
import Icon from '../../components/common/Icon';
import { useBible } from '../../bible';

// ─────────────────────────── CSS injection ───────────────────────────
const _css = `
  .pf-editor:focus { outline: none; }
  .pf-editor p:first-child:first-letter { font-size: 3em; float: left; line-height: 1; margin-right: 0.1em; }
  .pf-title-input { font-family: 'Cinzel Decorative', serif; }
  .pf-sidebar::-webkit-scrollbar { width: 4px; }
  .pf-sidebar::-webkit-scrollbar-track { background: transparent; }
  .pf-sidebar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .dark .pf-sidebar::-webkit-scrollbar-thumb { background: #4b5563; }
  .pf-toolbar-scroll { scrollbar-width: none; -ms-overflow-style: none; }
  .pf-toolbar-scroll::-webkit-scrollbar { display: none; }
  /* Scripture float button */
  .pf-scripture-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 10px 18px 10px 14px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f5ff 100%);
    border: 1.5px solid rgba(99,102,241,0.25); border-radius: 100px;
    color: var(--color-primary,#6366f1); font-size: 13px; font-weight: 600;
    box-shadow: 0 4px 14px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.06);
    transition: box-shadow .2s, transform .15s, background .2s, border-color .2s;
    position: relative; overflow: hidden;
  }
  .pf-scripture-btn:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,.13), 0 2px 6px rgba(0,0,0,.08);
    background: linear-gradient(135deg, #ffffff 0%, #f0edff 100%);
    border-color: rgba(99,102,241,.45); transform: translateY(-1px);
  }
  .pf-scripture-icon {
    display:flex; align-items:center; justify-content:center;
    width:26px; height:26px;
    background: linear-gradient(135deg, var(--color-primary,#6366f1), #8b5cf6);
    border-radius: 50%; color:#fff; flex-shrink:0;
    transition: transform .25s cubic-bezier(.34,1.56,.64,1);
  }
  .pf-scripture-btn:hover .pf-scripture-icon { transform: rotate(8deg) scale(1.1); }
  .pf-ripple {
    position:absolute; inset:-4px; border-radius:100px;
    border:1.5px solid rgba(99,102,241,.35);
    animation: pf-pulse 2.8s ease-in-out infinite; pointer-events:none;
  }
  @keyframes pf-pulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:0;transform:scale(1.12)} }
  .pf-scripture-btn:hover .pf-ripple { animation:none; opacity:0; }

  /* Mobile bottom sheet */
  @media (max-width: 767px) {
    .pf-sidebar-sheet {
      position: fixed; inset: 0; z-index: 40;
    }
    .pf-sidebar-sheet-panel {
      position: absolute; bottom: 0; left: 0; right: 0;
      max-height: 85vh; border-radius: 20px 20px 0 0;
      background: #fff; overflow-y: auto;
      box-shadow: 0 -4px 40px rgba(0,0,0,.18);
      animation: pf-sheet-up .28s cubic-bezier(.32,1,.4,1);
    }
    @keyframes pf-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
    .dark .pf-sidebar-sheet-panel { background: #1e293b; }
  }
`;
if (!document.head.querySelector('style[data-pf]')) {
  const s = document.createElement('style');
  s.setAttribute('data-pf', 'true');
  s.textContent = _css;
  document.head.appendChild(s);
}

// ─────────────────────────── Types ───────────────────────────
interface PostMeta {
  contentType: string;
  series: string;
  tags: string[];
  featuredImage: string | null;
  videoUrl: string;
  allowComments: boolean;
  allowReactions: boolean;
  featuredOnHomepage: boolean;
}

interface PostFormProps {
  mode?: 'create' | 'edit';
  postId?: string;
  draftId?: string;
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─────────────────────────── useContentEditable ───────────────────────────
const useContentEditable = (initial: string) => {
  const [content, setContent] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const updating = useRef(false);
  const cursorRef = useRef<{ node: Node; offset: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveCursor = useCallback(() => {
    const sel = window.getSelection();
    if (sel?.rangeCount && ref.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const r = sel.getRangeAt(0);
      cursorRef.current = { node: r.startContainer, offset: r.startOffset };
    }
  }, []);

  const restoreCursor = useCallback(() => {
    if (!cursorRef.current || !ref.current) return;
    try {
      const { node, offset } = cursorRef.current;
      if (ref.current.contains(node)) {
        const sel = window.getSelection();
        const r = document.createRange();
        r.setStart(node, Math.min(offset, node.textContent?.length || 0));
        r.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    } catch { /**/ }
  }, []);

  const handleChange = useCallback(() => {
    if (!ref.current) return;
    saveCursor();
    updating.current = true;
    const html = ref.current.innerHTML;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (html !== content) setContent(html);
      updating.current = false;
    }, 300);
  }, [content, saveCursor]);

  useEffect(() => {
    if (ref.current && !updating.current && ref.current.innerHTML !== content) {
      updating.current = true;
      saveCursor();
      ref.current.innerHTML = content;
      restoreCursor();
      updating.current = false;
    }
  }, [content, saveCursor, restoreCursor]);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initial) ref.current.innerHTML = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { ref, content, setContent, handleChange };
};

// ─────────────────────────── Small UI primitives ───────────────────────────
const ToolbarButton = React.memo<{
  icon: LucideIcon; active?: boolean; onClick: () => void; title: string; className?: string;
}>(({ icon: Ic, active, onClick, title, className = '' }) => (
  <button
    onClick={onClick} title={title}
    className={`relative group flex items-center justify-center px-2.5 py-2 rounded-lg transition-all duration-150 ${
      active ? 'bg-primary/10 text-primary dark:bg-primary/20'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    } ${className}`}
  >
    <Ic className="w-4 h-4" />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">{title}</span>
  </button>
));

const TDiv: React.FC = () => <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />;

const DropdownMenu = React.memo<{
  trigger: React.ReactNode; children: React.ReactNode; align?: 'left' | 'right'; width?: number;
}>(({ trigger, children, align = 'left', width = 160 }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !trigRef.current) return;
    const r = trigRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, m = 12;
    let left = align === 'right' ? r.right - width : r.left;
    left = Math.max(m, Math.min(left, vw - width - m));
    const top = r.bottom + 6 + 300 > vh ? r.top - 300 : r.bottom + 6;
    setPos({ top, left });
  }, [open, align, width]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const hs = () => setOpen(false);
    document.addEventListener('mousedown', h);
    window.addEventListener('scroll', hs, { passive: true });
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('scroll', hs); };
  }, []);

  return (
    <div className="relative inline-block" ref={wrap}>
      <div ref={trigRef} onClick={() => setOpen(o => !o)} className="cursor-pointer">{trigger}</div>
      {open && (
        <div
          className="fixed bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 py-1.5 z-[9999] shadow-xl overflow-y-auto"
          style={{ width, top: pos.top, left: pos.left, maxHeight: '70vh' }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
});

const DItem = React.memo<{
  onClick: () => void; icon?: LucideIcon; children: React.ReactNode; shortcut?: string;
}>(({ onClick, icon: Ic, children, shortcut }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 hover:bg-primary/10 hover:text-primary flex items-center justify-between group transition-colors"
  >
    <span className="flex items-center gap-3">
      {Ic && <Ic className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-primary" />}
      {children}
    </span>
    {shortcut && <span className="text-xs text-slate-400 ml-2">{shortcut}</span>}
  </button>
));

const ColorPicker = React.memo<{ value: string; onChange: (c: string) => void; label?: string; icon?: LucideIcon }>(
  ({ value, onChange, label, icon: Ic }) => {
    const [open, setOpen] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);
    const COLORS = [
      '#000','#434343','#666','#999','#b7b7b7','#ccc','#d9d9d9','#efefef',
      '#980000','#f00','#f90','#ff0','#0f0','#0ff','#4a86e8','#00f',
      '#9900ff','#f0f','#f4cccc','#fce5cd','#fff2cc','#d9ead3','#d0e0e3','#cfe2f3',
      '#d9d2e9','#ead1dc','#ea9999','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#9fc5e8',
    ];
    useEffect(() => {
      const h = (e: MouseEvent) => {
        if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
      };
      if (open) document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return (
      <div className="relative" ref={wrap}>
        <button
          onClick={() => setOpen(o => !o)} title={label}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {Ic && <Ic className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
          <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: value }} />
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-60 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50">
            <div className="grid grid-cols-8 gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => { onChange(c); setOpen(false); }}
                  className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer" />
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Small toggle switch
const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
  <button
    onClick={onChange}
    className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${value ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
  </button>
);

// ─────────────────────────── Modals ───────────────────────────
const ModalWrap: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }> = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 space-y-4">{children}</div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">{footer}</div>
    </div>
  </div>
);
const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    {children}
  </div>
);
const inputCls = "w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm";

const BtnCancel: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
);
const BtnPrimary: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">{children}</button>
);

const LinkModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (url: string, text: string, title?: string, target?: string) => void }> = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState(''); const [text, setText] = useState(''); const [title, setTitle] = useState(''); const [target, setTarget] = useState('_blank');
  if (!isOpen) return null;
  return (
    <ModalWrap title="Insert Link" onClose={onClose} footer={<><BtnCancel onClick={onClose} /><BtnPrimary onClick={() => { onInsert(url, text || url, title, target); onClose(); }} disabled={!url}>Insert Link</BtnPrimary></>}>
      <FieldRow label="URL"><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className={inputCls} autoFocus /></FieldRow>
      <FieldRow label="Link Text (optional)"><input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Click here" className={inputCls} /></FieldRow>
      <FieldRow label="Title (tooltip)"><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Additional info" className={inputCls} /></FieldRow>
      <FieldRow label="Open in"><select value={target} onChange={e => setTarget(e.target.value)} className={inputCls}><option value="_blank">New tab</option><option value="_self">Same tab</option></select></FieldRow>
    </ModalWrap>
  );
};

const ImageModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (url: string, alt: string, width?: string, height?: string, align?: string) => void }> = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState(''); const [alt, setAlt] = useState(''); const [width, setWidth] = useState(''); const [height, setHeight] = useState(''); const [align, setAlign] = useState('left');
  if (!isOpen) return null;
  return (
    <ModalWrap title="Insert Image" onClose={onClose} footer={<><BtnCancel onClick={onClose} /><BtnPrimary onClick={() => { onInsert(url, alt, width, height, align); onClose(); }} disabled={!url}>Insert Image</BtnPrimary></>}>
      <FieldRow label="Image URL"><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…/image.jpg" className={inputCls} autoFocus /></FieldRow>
      <FieldRow label="Alt Text"><input type="text" value={alt} onChange={e => setAlt(e.target.value)} placeholder="Description of image" className={inputCls} /></FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Width"><input value={width} onChange={e => setWidth(e.target.value)} placeholder="Auto" className={inputCls} /></FieldRow>
        <FieldRow label="Height"><input value={height} onChange={e => setHeight(e.target.value)} placeholder="Auto" className={inputCls} /></FieldRow>
      </div>
      <FieldRow label="Alignment"><select value={align} onChange={e => setAlign(e.target.value)} className={inputCls}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></FieldRow>
    </ModalWrap>
  );
};

const TableModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (rows: number, cols: number, style: string) => void }> = ({ isOpen, onClose, onInsert }) => {
  const [rows, setRows] = useState(3); const [cols, setCols] = useState(3); const [style, setStyle] = useState('default');
  if (!isOpen) return null;
  return (
    <ModalWrap title="Insert Table" onClose={onClose} footer={<><BtnCancel onClick={onClose} /><BtnPrimary onClick={() => { onInsert(rows, cols, style); onClose(); }}>Insert Table</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Rows"><input type="number" value={rows} onChange={e => setRows(+e.target.value || 1)} min={1} max={20} className={inputCls} /></FieldRow>
        <FieldRow label="Columns"><input type="number" value={cols} onChange={e => setCols(+e.target.value || 1)} min={1} max={20} className={inputCls} /></FieldRow>
      </div>
      <FieldRow label="Style"><select value={style} onChange={e => setStyle(e.target.value)} className={inputCls}><option value="default">Default</option><option value="bordered">Bordered</option><option value="striped">Striped</option><option value="minimal">Minimal</option></select></FieldRow>
    </ModalWrap>
  );
};

const FindReplaceModal: React.FC<{ isOpen: boolean; onClose: () => void; onFind: (t: string) => void; onReplace: (f: string, r: string, all: boolean) => void }> = ({ isOpen, onClose, onFind, onReplace }) => {
  const [find, setFind] = useState(''); const [replace, setReplace] = useState('');
  if (!isOpen) return null;
  return (
    <ModalWrap title="Find & Replace" onClose={onClose} footer={<>
      <button onClick={() => onFind(find)} disabled={!find} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40">Find</button>
      <button onClick={() => onReplace(find, replace, false)} disabled={!find} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40">Replace</button>
      <BtnPrimary onClick={() => onReplace(find, replace, true)} disabled={!find}>Replace All</BtnPrimary>
    </>}>
      <FieldRow label="Find"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={find} onChange={e => setFind(e.target.value)} placeholder="Text to find" className={`${inputCls} pl-9`} autoFocus /></div></FieldRow>
      <FieldRow label="Replace with"><input type="text" value={replace} onChange={e => setReplace(e.target.value)} placeholder="Replacement text" className={inputCls} /></FieldRow>
    </ModalWrap>
  );
};

const SpecialCharsModal: React.FC<{ isOpen: boolean; onClose: () => void; onInsert: (c: string) => void }> = ({ isOpen, onClose, onInsert }) => {
  const cats = [
    { name: 'Common',   chars: ['©','®','™','§','¶','†','‡','•','·','…','—','–'] },
    { name: 'Currency', chars: ['$','€','£','¥','¢','₽','₹','₿','₦','₩'] },
    { name: 'Math',     chars: ['±','×','÷','≠','≈','≤','≥','∞','√','∑','∏','∫'] },
    { name: 'Arrows',   chars: ['←','→','↑','↓','↔','⇐','⇒','⇑','⇓'] },
    { name: 'Greek',    chars: ['α','β','γ','δ','ε','ζ','θ','λ','μ','π','σ'] },
    { name: 'Symbols',  chars: ['♥','♦','♣','♠','♫','☺','☼','♀','♂','♯'] },
  ];
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-bold">Special Characters</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {cats.map(cat => (
            <div key={cat.name}>
              <p className="text-xs font-semibold text-slate-500 mb-2">{cat.name}</p>
              <div className="flex flex-wrap gap-2">
                {cat.chars.map(c => (
                  <button key={c} onClick={() => { onInsert(c); onClose(); }}
                    className="w-9 h-9 text-lg font-mono hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-all">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatisticsModal: React.FC<{ isOpen: boolean; onClose: () => void; content: string }> = ({ isOpen, onClose, content }) => {
  if (!isOpen) return null;
  const text = content.replace(/<[^>]*>?/gm, '');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
  const paragraphs = content.split('</p>').filter(p => p.trim()).length;
  const readTime = Math.ceil(words / 200);
  const syllables = (text.toLowerCase().replace(/[^a-z]/g, '').length / 2) || 1;
  const flesch = Math.round(206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words));
  const stats = [
    { label: 'Words', value: words }, { label: 'Characters', value: chars },
    { label: 'Sentences', value: sentences }, { label: 'Paragraphs', value: paragraphs },
    { label: 'Reading Time', value: `${readTime} min` }, { label: 'Flesch Score', value: flesch },
  ];
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-bold">Document Statistics</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {stats.map(s => (
            <div key={s.label} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div className="text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TemplateModal: React.FC<{ isOpen: boolean; onClose: () => void; onSelect: (t: any) => void }> = ({ isOpen, onClose, onSelect }) => {
  const templates = [
    { id: 'sermon', name: 'Sermon Note', icon: BookOpen, content: '<h1>Sermon Title</h1><h2>Scripture: </h2><h3>Introduction</h3><p></p><h3>Main Points</h3><ol><li></li><li></li><li></li></ol><h3>Application</h3><p></p><h3>Prayer Points</h3><ul><li></li></ul>' },
    { id: 'devotional', name: 'Daily Devotional', icon: Sparkles, content: '<h1>Daily Devotional</h1><h2>Date: </h2><h3>Opening Prayer</h3><p></p><h3>Scripture Reading</h3><p></p><h3>Reflection</h3><p></p><h3>Closing Prayer</h3><p></p>' },
    { id: 'article', name: 'Article / Essay', icon: FileText, content: '<h1>Title</h1><h2>By Author</h2><h3>Introduction</h3><p></p><h3>Section 1</h3><p></p><h3>Conclusion</h3><p></p>' },
    { id: 'study', name: 'Bible Study', icon: BookOpen, content: '<h1>Bible Study: </h1><h2>Passage: </h2><h3>Context</h3><p></p><h3>Interpretation</h3><p></p><h3>Application</h3><p></p>' },
    { id: 'prayer', name: 'Prayer Journal', icon: Heart, content: '<h1>Prayer Journal</h1><h2>Date: </h2><h3>Thanksgiving</h3><p></p><h3>Intercession</h3><p></p><h3>Response</h3><p></p>' },
    { id: 'announcement', name: 'Announcement', icon: Megaphone, content: '<h1>Announcements</h1><h2>Date: </h2><h3>This Week</h3><ul><li></li></ul><h3>Upcoming Events</h3><ul><li></li></ul>' },
  ];
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-bold">Templates</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map(t => {
            const Ic = t.icon;
            return (
              <button key={t.id} onClick={() => { onSelect(t); onClose(); }}
                className="p-5 text-left border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20"><Ic className="w-5 h-5 text-primary" /></div>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{t.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────── Main Component ───────────────────────────
const PostForm: React.FC<PostFormProps> = ({ mode = 'create', postId, draftId, initialData, onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const { searchVerses, getVerse, getChapter, getBooks, getBookInfo, isReady: isBibleReady } = useBible() as any;

  const isEdit = mode === 'edit' || !!postId;
  const isDraft = !!draftId;

  // ── State ──
  const [title, setTitle] = useState('');
  const [meta, setMeta] = useState<PostMeta>({
    contentType: 'Sermon Note', series: '', tags: [], featuredImage: null,
    videoUrl: '', allowComments: true, allowReactions: true, featuredOnHomepage: false,
  });
  const [newTag, setNewTag] = useState('');
  const [postStatus, setPostStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [seriesList, setSeriesList] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop
  const [mobileSidebar, setMobileSidebar] = useState(false); // mobile sheet

  // Formatting
  const [fontFamily, setFontFamily] = useState('Georgia');
  const [fontSize, setFontSize] = useState(18);
  const [textColor, setTextColor] = useState('#1c1917');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontWeight, setFontWeight] = useState('normal');
  const [wordSpacing, setWordSpacing] = useState(0);
  const [columnCount, setColumnCount] = useState(1);
  const [dropCap, setDropCap] = useState(false);
  const [smallCaps, setSmallCaps] = useState(false);
  const [formats, setFormats] = useState({ bold: false, italic: false, underline: false, strikethrough: false, h1: false, h2: false, h3: false, h4: false, h5: false, h6: false, alignLeft: true, alignCenter: false, alignRight: false, alignJustify: false, bulletList: false, numberList: false, blockquote: false, code: false, subscript: false, superscript: false });

  // Modals
  const [showLink, setShowLink] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScripture, setShowScripture] = useState(false);

  // Scripture
  const [scriptureQuery, setScriptureQuery] = useState('');
  const [liveResults, setLiveResults] = useState<{ reference: string; text: string; type: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [searchBook, setSearchBook] = useState('');
  const [searchTestament, setSearchTestament] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scripture drag float button
  const floatBtnRef = useRef<HTMLButtonElement>(null);
  const dragActive = useRef(false);
  const dragMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragPosRef = useRef({ x: 0, y: 0 });
  const dragFrame = useRef<number | null>(null);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  const { ref: editorRef, content, setContent, handleChange } = useContentEditable(
    '<p class="mb-6 text-slate-400">Start writing here…</p>'
  );

  // ── Load data ──
  useEffect(() => {
    seriesService.getAllSeries().then(s => setSeriesList(s)).catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      if (isEdit && postId) {
        setLoading(true);
        try {
          const post = await postService.getPost(postId);
          setTitle(post.title || '');
          setContent(post.content || '');
          setMeta({ contentType: post.content_type || 'Sermon Note', series: post.series || '', tags: (post as any).tags || [], featuredImage: post.featured_image || null, videoUrl: post.video_url || '', allowComments: post.comments_enabled ?? true, allowReactions: post.reactions_enabled ?? true, featuredOnHomepage: (post as any).is_featured || false });
          setPostStatus(post.status as any || 'DRAFT');
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
      } else if (isDraft && draftId) {
        setLoading(true);
        try {
          const draft = await draftService.getDraft(draftId);
          const d = draft.draft_data || {};
          setTitle(d.title || ''); setContent(d.content || '');
          setMeta({ contentType: draft.content_type || 'Sermon Note', series: d.series || '', tags: (d as any).tags || [], featuredImage: d.featured_image || null, videoUrl: d.video_url || '', allowComments: d.comments_enabled ?? true, allowReactions: d.reactions_enabled ?? true, featuredOnHomepage: d.is_featured || false });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
      } else if (initialData) {
        const d = (initialData as any).draft_data || initialData;
        setTitle(d.title || initialData.title || '');
        setContent(d.content || initialData.content || '');
        setMeta(prev => ({ ...prev, contentType: d.content_type || prev.contentType, series: d.series || '', tags: d.tags || [], featuredImage: d.featured_image || null, videoUrl: d.video_url || '', allowComments: d.comments_enabled ?? true, allowReactions: d.reactions_enabled ?? true, featuredOnHomepage: d.is_featured || false }));
      }
    };
    load();
  }, [isEdit, isDraft, postId, draftId]);

  useEffect(() => {
    if (titleRef.current) { titleRef.current.style.height = 'auto'; titleRef.current.style.height = `${titleRef.current.scrollHeight}px`; }
  }, [title]);

  useEffect(() => {
    const x = window.innerWidth - 200, y = window.innerHeight - 80;
    dragPosRef.current = { x, y };
    setFloatPos({ x, y });
  }, []);

  useEffect(() => () => { if (dragFrame.current) cancelAnimationFrame(dragFrame.current); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pf_scripture_hist');
      if (raw) setSearchHistory(JSON.parse(raw).slice(0, 12));
    } catch { /**/ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('pf_scripture_hist', JSON.stringify(searchHistory.slice(0, 12))); } catch { /**/ }
  }, [searchHistory]);

  // ── Auto-save every 30s ──
  useEffect(() => {
    const t = setTimeout(() => doSaveDraft(), 30000);
    return () => clearTimeout(t);
  }, [title, content, meta]);

  // ── Commands ──
  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    handleChange();
  }, [handleChange]);

  const fmt = useCallback((f: keyof typeof formats) => {
    const cmds: Record<string, () => void> = {
      bold: () => { exec('bold'); setFormats(p => ({ ...p, bold: !p.bold })); },
      italic: () => { exec('italic'); setFormats(p => ({ ...p, italic: !p.italic })); },
      underline: () => { exec('underline'); setFormats(p => ({ ...p, underline: !p.underline })); },
      strikethrough: () => { exec('strikeThrough'); setFormats(p => ({ ...p, strikethrough: !p.strikethrough })); },
      h1: () => { exec('formatBlock', '<h1>'); setFormats(p => ({ ...p, h1: !p.h1, h2: false, h3: false, h4: false, h5: false, h6: false })); },
      h2: () => { exec('formatBlock', '<h2>'); setFormats(p => ({ ...p, h2: !p.h2, h1: false, h3: false, h4: false, h5: false, h6: false })); },
      h3: () => { exec('formatBlock', '<h3>'); setFormats(p => ({ ...p, h3: !p.h3, h1: false, h2: false, h4: false, h5: false, h6: false })); },
      h4: () => { exec('formatBlock', '<h4>'); setFormats(p => ({ ...p, h4: !p.h4, h1: false, h2: false, h3: false, h5: false, h6: false })); },
      h5: () => { exec('formatBlock', '<h5>'); setFormats(p => ({ ...p, h5: !p.h5, h1: false, h2: false, h3: false, h4: false, h6: false })); },
      h6: () => { exec('formatBlock', '<h6>'); setFormats(p => ({ ...p, h6: !p.h6, h1: false, h2: false, h3: false, h4: false, h5: false })); },
      alignLeft: () => { exec('justifyLeft'); setFormats(p => ({ ...p, alignLeft: true, alignCenter: false, alignRight: false, alignJustify: false })); },
      alignCenter: () => { exec('justifyCenter'); setFormats(p => ({ ...p, alignLeft: false, alignCenter: true, alignRight: false, alignJustify: false })); },
      alignRight: () => { exec('justifyRight'); setFormats(p => ({ ...p, alignLeft: false, alignCenter: false, alignRight: true, alignJustify: false })); },
      alignJustify: () => { exec('justifyFull'); setFormats(p => ({ ...p, alignLeft: false, alignCenter: false, alignRight: false, alignJustify: true })); },
      bulletList: () => { exec('insertUnorderedList'); setFormats(p => ({ ...p, bulletList: !p.bulletList })); },
      numberList: () => { exec('insertOrderedList'); setFormats(p => ({ ...p, numberList: !p.numberList })); },
      blockquote: () => { exec('formatBlock', '<blockquote>'); setFormats(p => ({ ...p, blockquote: !p.blockquote })); },
      code: () => { exec('formatBlock', '<pre>'); setFormats(p => ({ ...p, code: !p.code })); },
      subscript: () => { exec('subscript'); setFormats(p => ({ ...p, subscript: !p.subscript })); },
      superscript: () => { exec('superscript'); setFormats(p => ({ ...p, superscript: !p.superscript })); },
    };
    cmds[f]?.();
  }, [exec]);

  const AlignIcon = formats.alignLeft ? AlignLeft : formats.alignCenter ? AlignCenter : formats.alignRight ? AlignRight : AlignJustify;

  // ── Save / Publish ──
  const buildPayload = () => ({
    title, content, content_type: meta.contentType, series: meta.series, tags: meta.tags,
    featured_image: meta.featuredImage === null ? undefined : meta.featuredImage,
    video_url: meta.videoUrl, comments_enabled: meta.allowComments,
    reactions_enabled: meta.allowReactions, is_featured: meta.featuredOnHomepage,
  });

  const doSaveDraft = async () => {
    if (!title.trim() && !content.trim()) return;
    setSaving(true);
    try {
      const payload = { draft_data: buildPayload(), content_type: meta.contentType, post: isEdit && postId ? postId : undefined };
      if (isDraft && draftId) await draftService.updateDraft(draftId, { draft_data: buildPayload() });
      else await draftService.createDraft(payload);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const doPublish = async () => {
    if (!title.trim()) { alert('Please enter a title.'); return; }
    setSaving(true);
    try {
      const payload = { ...buildPayload(), status: 'PUBLISHED' as const };
      if (isEdit && postId) { await postService.updatePost(postId, payload); if (draftId) await draftService.deleteDraft(draftId); }
      else if (isDraft && draftId) await draftService.publishDraft(draftId);
      else await postService.createPost(payload);
      if (onSuccess) onSuccess();
      else navigate('/admin/content');
    } catch (e) { console.error(e); alert('Publish failed.'); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!window.confirm('Move to trash?')) return;
    try {
      if (isEdit && postId) await postService.deletePost(postId);
      else if (isDraft && draftId) await draftService.deleteDraft(draftId);
      if (onCancel) onCancel(); else navigate('/admin/content');
    } catch { alert('Failed.'); }
  };

  // ── Insert helpers ──
  const insertLink = (url: string, text: string, titleAttr?: string, target?: string) => {
    const sel = window.getSelection();
    if (sel?.rangeCount && !sel.isCollapsed) { exec('createLink', url); }
    else exec('insertHTML', `<a href="${url}" title="${titleAttr || ''}" target="${target || '_blank'}" rel="noopener noreferrer" class="text-primary underline">${text || url}</a>`);
  };
  const insertImage = (url: string, alt: string, w?: string, h?: string, align?: string) => {
    exec('insertHTML', `<img src="${url}" alt="${alt}" class="max-w-full ${align ? `float-${align}` : ''}" style="${w ? `width:${w};` : ''}${h ? `height:${h};` : ''}margin:10px;" />`);
  };
  const insertTable = (rows: number, cols: number, styleOpt: string) => {
    const cls = styleOpt === 'minimal' ? '' : 'border border-slate-300';
    let html = '<table class="w-full border-collapse">';
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) html += `<td class="p-2 ${cls}">${i === 0 ? `Header ${j + 1}` : ''}</td>`;
      html += '</tr>';
    }
    html += '</table>';
    exec('insertHTML', html);
  };
  const handleFind = (text: string) => {
    const sel = window.getSelection(); sel?.removeAllRanges();
    if (!text || !editorRef.current) return;
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent?.toLowerCase().includes(text.toLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const node = walker.nextNode();
    if (node) { const r = document.createRange(); const idx = node.textContent!.toLowerCase().indexOf(text.toLowerCase()); r.setStart(node, idx); r.setEnd(node, idx + text.length); sel?.addRange(r); }
  };
  const handleReplace = (find: string, replace: string, all: boolean) => {
    if (!find || !editorRef.current) return;
    if (all) { editorRef.current.innerHTML = editorRef.current.innerHTML.replace(new RegExp(find, 'gi'), replace); setContent(editorRef.current.innerHTML); }
    else { const sel = window.getSelection(); if (sel?.rangeCount) { const r = sel.getRangeAt(0); if (r.toString().toLowerCase() === find.toLowerCase()) { r.deleteContents(); r.insertNode(document.createTextNode(replace)); handleChange(); } } }
  };

  // ── Scripture ──
  const BOOK_ALIASES: Record<string, string> = {
    'gen':'Genesis','ex':'Exodus','lev':'Leviticus','num':'Numbers','deut':'Deuteronomy',
    'josh':'Joshua','judg':'Judges','ruth':'Ruth','1sam':'1 Samuel','2sam':'2 Samuel',
    '1kgs':'1 Kings','2kgs':'2 Kings','1chr':'1 Chronicles','2chr':'2 Chronicles',
    'ezra':'Ezra','neh':'Nehemiah','est':'Esther','job':'Job','ps':'Psalms','psa':'Psalms',
    'prov':'Proverbs','eccl':'Ecclesiastes','isa':'Isaiah','jer':'Jeremiah','lam':'Lamentations',
    'ezek':'Ezekiel','dan':'Daniel','hos':'Hosea','joel':'Joel','amos':'Amos','jonah':'Jonah',
    'mic':'Micah','nah':'Nahum','hab':'Habakkuk','zeph':'Zephaniah','hag':'Haggai',
    'zech':'Zechariah','mal':'Malachi','matt':'Matthew','mk':'Mark','lk':'Luke','jn':'John',
    'acts':'Acts','rom':'Romans','1cor':'1 Corinthians','2cor':'2 Corinthians','gal':'Galatians',
    'eph':'Ephesians','phil':'Philippians','col':'Colossians','1thess':'1 Thessalonians',
    '2thess':'2 Thessalonians','1tim':'1 Timothy','2tim':'2 Timothy','tit':'Titus',
    'heb':'Hebrews','jas':'James','1pet':'1 Peter','2pet':'2 Peter','1jn':'1 John',
    '2jn':'2 John','3jn':'3 John','jude':'Jude','rev':'Revelation',
  };

  const parseRef = (input: string) => {
    const str = input.trim();
    const m = str.match(/^((?:\d\s)?[a-zA-Z]+(?:\s[a-zA-Z]+)?)\s*(\d+)?(?:\s*:\s*(\d+))?(?:\s*[-–]\s*(\d+))?$/i);
    if (!m) return null;
    const rawBook = m[1].trim();
    const chapter = m[2] ? +m[2] : null;
    const verseStart = m[3] ? +m[3] : null;
    const verseEnd = m[4] ? +m[4] : verseStart;
    const allBooks = (getBooks as any)('KJV');
    const norm = rawBook.toLowerCase().replace(/\s+/g, '');
    let resolved = BOOK_ALIASES[norm] || BOOK_ALIASES[rawBook.toLowerCase()];
    if (!resolved) { const f = allBooks.find((b: any) => b.name.toLowerCase().startsWith(rawBook.toLowerCase())); if (f) resolved = f.name; }
    if (!resolved) return null;
    const bookObj = allBooks.find((b: any) => b.name === resolved);
    if (!bookObj) return null;
    return { bookNumber: bookObj.number, bookName: bookObj.name, chapter, verseStart, verseEnd };
  };

  const getScriptureResults = (query: string, bookF = '', testF = '', lim = 50) => {
    if (!isBibleReady || !query.trim()) return [];
    const parsed = parseRef(query);
    const results: { reference: string; text: string; type: 'reference' | 'keyword' }[] = [];
    if (parsed) {
      const { bookNumber, bookName, chapter, verseStart, verseEnd } = parsed;
      if (chapter && verseStart) { for (let v = verseStart; v <= (verseEnd || verseStart); v++) { const t = getVerse(bookNumber, chapter, v, 'KJV'); if (t) results.push({ reference: `${bookName} ${chapter}:${v}`, text: t, type: 'reference' }); } }
      else if (chapter) { (getChapter(bookNumber, chapter, 'KJV') as any[]).slice(0, lim).forEach((item: any) => results.push({ reference: `${bookName} ${chapter}:${item.verse}`, text: item.text, type: 'reference' })); }
      else { (getChapter(bookNumber, 1, 'KJV') as any[]).slice(0, lim).forEach((item: any) => results.push({ reference: `${bookName} 1:${item.verse}`, text: item.text, type: 'reference' })); }
      setTotalMatches(results.length); return results;
    }
    const ql = query.toLowerCase();
    const allBooks = (getBooks('KJV') as any[]).filter((b: any) => {
      if (bookF && b.name !== bookF) return false;
      if (testF === 'OT' && b.testament !== 'OT') return false;
      if (testF === 'NT' && b.testament !== 'NT') return false;
      return true;
    });
    let total = 0;
    for (const book of allBooks) {
      const info = getBookInfo(book.number); const chs = info?.chapters || 0;
      for (let ch = 1; ch <= chs; ch++) {
        for (const { verse, text } of (getChapter(book.number, ch, 'KJV') as any[])) {
          if (text.toLowerCase().includes(ql)) {
            total++;
            if (results.length < lim) results.push({ reference: `${book.name} ${ch}:${verse}`, text, type: 'keyword' });
          }
        }
      }
    }
    setTotalMatches(total); return results;
  };

  const handleScriptureQuery = (val: string) => {
    setScriptureQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setLiveResults([]); return; }
    setIsSearching(true);
    searchTimer.current = setTimeout(() => {
      setDisplayLimit(50);
      const r = getScriptureResults(val, searchBook, searchTestament, 50);
      setLiveResults(r);
      if (val.trim()) setSearchHistory(prev => [val.trim(), ...prev.filter(x => x.toLowerCase() !== val.trim().toLowerCase())].slice(0, 12));
      setIsSearching(false);
    }, 280);
  };

  const insertScripture = (ref: string, text: string) => {
    const html = `<div class="my-10 border-l-4 border-primary/40 pl-8 py-2 bg-primary/5 rounded-r-lg"><p class="italic text-2xl text-slate-700 font-serif leading-relaxed">"${text}"</p><cite class="block mt-3 font-bold text-sm text-primary uppercase tracking-wider">${ref}</cite></div>`;
    if (editorRef.current) {
      const sel = window.getSelection();
      if (sel?.rangeCount) { const r = sel.getRangeAt(0); r.deleteContents(); const div = document.createElement('div'); div.innerHTML = html; const frag = document.createDocumentFragment(); while (div.firstChild) frag.appendChild(div.firstChild); r.insertNode(frag); }
      else editorRef.current.innerHTML += html;
      handleChange();
    }
    setShowScripture(false); setScriptureQuery(''); setLiveResults([]);
  };

  // ── Float drag ──
  const onFloatMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = floatBtnRef.current; if (!btn) return;
    e.preventDefault();
    dragActive.current = true; dragMoved.current = false; setIsDragging(true);
    const r = btn.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    const onMove = (ev: MouseEvent) => {
      if (!dragActive.current) return;
      const bw = btn.offsetWidth, bh = btn.offsetHeight;
      const nx = Math.min(Math.max(0, ev.clientX - dragOffset.current.x), window.innerWidth - bw);
      const ny = Math.min(Math.max(0, ev.clientY - dragOffset.current.y), window.innerHeight - bh);
      if (Math.abs(nx - dragPosRef.current.x) + Math.abs(ny - dragPosRef.current.y) > 3) dragMoved.current = true;
      dragPosRef.current = { x: nx, y: ny };
      if (dragFrame.current === null) dragFrame.current = requestAnimationFrame(() => { if (btn) { btn.style.left = `${dragPosRef.current.x}px`; btn.style.top = `${dragPosRef.current.y}px`; } dragFrame.current = null; });
    };
    const onUp = () => { dragActive.current = false; setIsDragging(false); setFloatPos({ ...dragPosRef.current }); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  };
  const onFloatClick = (e: React.MouseEvent) => { if (dragMoved.current) { dragMoved.current = false; e.preventDefault(); return; } setShowScripture(true); };

  // ── Tags ──
  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) { e.preventDefault(); if (!meta.tags.includes(newTag.trim())) setMeta(p => ({ ...p, tags: [...p.tags, newTag.trim()] })); setNewTag(''); }
  };

  // ── Sidebar content (reused for both desktop and mobile sheet) ──
  const SidebarContent = () => (
    <div className="p-6 space-y-8">
      {/* Publishing */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Publishing</h3>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${postStatus === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{postStatus}</span>
        </div>
        <button onClick={doPublish} disabled={saving} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          <Rocket className="w-4 h-4" />{saving ? 'Publishing…' : isEdit ? 'Update & Publish' : 'Publish Now'}
        </button>
        <button onClick={doSaveDraft} disabled={saving} className="mt-2 w-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Draft'}
        </button>
      </section>

      {/* Post Metadata */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Post Metadata</h3>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Content Type</label>
          <div className="relative">
            <select value={meta.contentType} onChange={e => setMeta(p => ({ ...p, contentType: e.target.value }))} className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-primary pr-8">
              {['Sermon Note','Article / Essay','Devotional','Announcement','Bible Study','Prayer Journal','Teaching','Testimony'].map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Series</label>
          <div className="relative">
            <select value={meta.series} onChange={e => setMeta(p => ({ ...p, series: e.target.value }))} className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-primary pr-8">
              <option value="">None</option>
              {seriesList.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {meta.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-full">
                {tag}<button onClick={() => setMeta(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary" placeholder="Add tag, press Enter…" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={addTag} />
        </div>
      </section>

      {/* Media */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Media</h3>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Featured Image</label>
          <ImageUploadInput value={meta.featuredImage || ''} onChange={url => setMeta(p => ({ ...p, featuredImage: url }))} />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Video Link</label>
          <div className="relative">
            <Video className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-primary" placeholder="YouTube or Vimeo URL" value={meta.videoUrl} onChange={e => setMeta(p => ({ ...p, videoUrl: e.target.value }))} />
          </div>
        </div>
      </section>

      {/* Engagement */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Engagement</h3>
        {([['Allow Comments', 'allowComments'], ['Emoji Reactions', 'allowReactions'], ['Feature on Homepage', 'featuredOnHomepage']] as [string, keyof PostMeta][]).map(([label, key]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <Toggle value={!!meta[key]} onChange={() => setMeta(p => ({ ...p, [key]: !p[key] }))} />
          </div>
        ))}
      </section>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <button onClick={doDelete} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-xl text-xs font-bold transition-all">
          <Trash2 className="w-4 h-4" />Move to Trash
        </button>
      </div>
    </div>
  );

  // ── Toolbar JSX ──
  const Toolbar = () => (
    <div className="pf-toolbar-scroll flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 flex-nowrap">
      <ToolbarButton icon={Undo} onClick={() => { exec('undo'); }} title="Undo" />
      <ToolbarButton icon={Redo} onClick={() => { exec('redo'); }} title="Redo" />
      <TDiv />

      {/* Font family */}
      <DropdownMenu trigger={<button className="px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fontFamily}<ChevronDown className="w-3 h-3" /></button>} width={170}>
        {['Inter','Georgia','Fraunces','Times New Roman','Helvetica','Courier New','Verdana','Tahoma'].map(f => <DItem key={f} onClick={() => { setFontFamily(f); exec('fontName', f); }}>{f}</DItem>)}
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu trigger={<button className="px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">{fontSize}<ChevronDown className="w-3 h-3" /></button>} width={100}>
        {[10,12,14,16,18,20,22,24,28,32,36,40,48,56,64,72].map(s => <DItem key={s} onClick={() => { setFontSize(s); exec('fontSize', s.toString()); }}>{s}px</DItem>)}
      </DropdownMenu>
      <TDiv />

      <ToolbarButton icon={Bold} active={formats.bold} onClick={() => fmt('bold')} title="Bold" />
      <ToolbarButton icon={Italic} active={formats.italic} onClick={() => fmt('italic')} title="Italic" />
      <ToolbarButton icon={Underline} active={formats.underline} onClick={() => fmt('underline')} title="Underline" />
      <ToolbarButton icon={Strikethrough} active={formats.strikethrough} onClick={() => fmt('strikethrough')} title="Strikethrough" />
      <ToolbarButton icon={Subscript} active={formats.subscript} onClick={() => fmt('subscript')} title="Subscript" />
      <ToolbarButton icon={Superscript} active={formats.superscript} onClick={() => fmt('superscript')} title="Superscript" />
      <TDiv />

      <ColorPicker value={textColor} onChange={c => { setTextColor(c); exec('foreColor', c); }} label="Text Color" icon={Type} />
      <ColorPicker value={highlightColor} onChange={c => { setHighlightColor(c); exec('backColor', c); }} label="Highlight" icon={Highlighter} />
      <TDiv />

      {/* Headings */}
      <DropdownMenu trigger={<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-600 dark:text-slate-300"><Heading className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></button>} width={150}>
        <DItem onClick={() => fmt('h1')} icon={Heading1} shortcut="H1">Heading 1</DItem>
        <DItem onClick={() => fmt('h2')} icon={Heading2} shortcut="H2">Heading 2</DItem>
        <DItem onClick={() => fmt('h3')} icon={Heading3} shortcut="H3">Heading 3</DItem>
        <DItem onClick={() => fmt('h4')} icon={Heading4} shortcut="H4">Heading 4</DItem>
        <DItem onClick={() => fmt('h5')} icon={Heading5} shortcut="H5">Heading 5</DItem>
        <DItem onClick={() => fmt('h6')} icon={Heading6} shortcut="H6">Heading 6</DItem>
        <div className="border-t border-slate-100 my-1" />
        <DItem onClick={() => exec('formatBlock', '<p>')}>Normal Paragraph</DItem>
      </DropdownMenu>

      {/* Alignment */}
      <DropdownMenu trigger={<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-600 dark:text-slate-300"><AlignIcon className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></button>} width={150}>
        <DItem onClick={() => fmt('alignLeft')} icon={AlignLeft}>Left</DItem>
        <DItem onClick={() => fmt('alignCenter')} icon={AlignCenter}>Center</DItem>
        <DItem onClick={() => fmt('alignRight')} icon={AlignRight}>Right</DItem>
        <DItem onClick={() => fmt('alignJustify')} icon={AlignJustify}>Justify</DItem>
      </DropdownMenu>
      <TDiv />

      <ToolbarButton icon={List} active={formats.bulletList} onClick={() => fmt('bulletList')} title="Bullet List" />
      <ToolbarButton icon={ListOrdered} active={formats.numberList} onClick={() => fmt('numberList')} title="Numbered List" />
      <ToolbarButton icon={Quote} active={formats.blockquote} onClick={() => fmt('blockquote')} title="Blockquote" />
      <ToolbarButton icon={Code} active={formats.code} onClick={() => fmt('code')} title="Code Block" />
      <TDiv />

      {/* Spacing */}
      <DropdownMenu trigger={<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-600 dark:text-slate-300"><AlignVerticalJustifyCenter className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></button>} width={140}>
        {[1, 1.15, 1.5, 1.75, 2, 2.5, 3].map(h => <DItem key={h} onClick={() => { setLineHeight(h); if (editorRef.current) editorRef.current.style.lineHeight = h.toString(); }}>{h === 1 ? 'Single (1.0)' : h === 2 ? 'Double (2.0)' : h.toString()}</DItem>)}
      </DropdownMenu>
      <DropdownMenu trigger={<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-600 dark:text-slate-300"><Space className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></button>} width={120}>
        {[-2,-1,-0.5,0,0.5,1,1.5,2,3,5].map(s => <DItem key={s} onClick={() => { setLetterSpacing(s); if (editorRef.current) editorRef.current.style.letterSpacing = `${s}px`; }}>{s === 0 ? 'Normal (0)' : `${s}px`}</DItem>)}
      </DropdownMenu>
      <TDiv />

      {/* Insert */}
      <DropdownMenu trigger={<button className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center gap-1 text-primary"><PlusCircle className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></button>} width={180}>
        <DItem onClick={() => setShowLink(true)} icon={Link} shortcut="Ctrl+K">Link</DItem>
        <DItem onClick={() => setShowImage(true)} icon={Image}>Inline Image</DItem>
        <DItem onClick={() => setShowTable(true)} icon={Table}>Table</DItem>
        <DItem onClick={() => exec('insertHorizontalRule')} icon={SeparatorHorizontal}>Horizontal Rule</DItem>
        <DItem onClick={() => setShowSpecialChars(true)} icon={SigmaSquare}>Special Characters</DItem>
        <div className="border-t border-slate-100 my-1" />
        <DItem onClick={() => exec('insertHTML', '<div class="p-4 bg-blue-50 border-l-4 border-blue-500 my-4 rounded-r"><p class="text-blue-700 text-sm font-medium">Info: </p></div>')} icon={Info}>Info Box</DItem>
        <DItem onClick={() => exec('insertHTML', '<div class="my-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl"><p class="text-yellow-800 text-sm">Callout: </p></div>')} icon={Megaphone}>Callout Box</DItem>
        <DItem onClick={() => exec('insertHTML', '<div class="my-8 text-2xl font-serif italic text-center text-slate-600 border-l-4 border-slate-300 pl-6">Pull quote</div>')} icon={Quote}>Pull Quote</DItem>
      </DropdownMenu>

      {/* Columns */}
      <DropdownMenu trigger={<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-600 dark:text-slate-300"><Columns2 className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></button>} width={130}>
        {[1, 2, 3].map(n => <DItem key={n} onClick={() => { setColumnCount(n); if (editorRef.current) { editorRef.current.style.columnCount = n > 1 ? n.toString() : ''; editorRef.current.style.columnGap = n > 1 ? '24px' : ''; } }}>{n === 1 ? '1 Column' : n === 2 ? '2 Columns' : '3 Columns'}</DItem>)}
      </DropdownMenu>

      <ToolbarButton icon={Search} onClick={() => setShowFindReplace(true)} title="Find & Replace" />
      <ToolbarButton icon={FileCheck} onClick={() => setShowStats(true)} title="Statistics" />
      <ToolbarButton icon={BookOpen} onClick={() => setShowScripture(true)} title="Scripture Lookup" />
      <TDiv />

      {/* Templates & Themes */}
      <DropdownMenu trigger={<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-slate-600 dark:text-slate-300"><LayoutTemplate className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></button>} width={140}>
        <DItem onClick={() => setShowTemplates(true)} icon={LayoutTemplate}>Templates</DItem>
      </DropdownMenu>

      {/* More */}
      <DropdownMenu trigger={<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><MoreHorizontal className="w-4 h-4" /></button>} align="right" width={170}>
        <DItem onClick={() => { const s = window.getSelection()?.toString(); if (s) exec('insertText', s.toUpperCase()); }} icon={CaseSensitive}>UPPERCASE</DItem>
        <DItem onClick={() => { const s = window.getSelection()?.toString(); if (s) exec('insertText', s.toLowerCase()); }} icon={CaseSensitive}>lowercase</DItem>
        <DItem onClick={() => setDropCap(!dropCap)} icon={WrapText}>{dropCap ? 'Remove Drop Cap' : 'Drop Cap'}</DItem>
        <div className="border-t border-slate-100 my-1" />
        <DItem onClick={() => alert('Voice typing coming soon!')} icon={Mic}>Voice Typing</DItem>
        <DItem onClick={() => alert('Shortcuts:\nCtrl+B Bold\nCtrl+I Italic\nCtrl+U Underline')} icon={Keyboard}>Keyboard Shortcuts</DItem>
        <DItem onClick={() => { const d = { title, content, meta }; localStorage.setItem('preview_data', JSON.stringify(d)); window.open('/preview', '_blank'); }} icon={Eye}>Preview in new tab</DItem>
      </DropdownMenu>
    </div>
  );

  // ─────────────────────────── Render ───────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Icon name="progress_activity" size={36} className="animate-spin" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 antialiased overflow-hidden">

      {/* ── Top Header Bar ── */}
      <header className="shrink-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4 z-30">
        {/* Left: back + breadcrumb */}
        <button onClick={() => onCancel ? onCancel() : navigate('/admin/content')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500">
          <button onClick={() => navigate('/admin/content')} className="hover:text-primary transition-colors">Content</button>
          <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{isEdit ? 'Edit Post' : 'New Post'}</span>
        </div>
        <div className="sm:hidden flex items-center gap-1.5">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-bold text-slate-900 dark:text-white text-sm">{isEdit ? 'Edit Post' : 'New Post'}</span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Auto-save indicator */}
          {saving && <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400"><Icon name="progress_activity" size={14} className="animate-spin" />Saving…</span>}

          {/* Preview */}
          <button
            onClick={() => { const d = { title, content, meta }; localStorage.setItem('preview_data', JSON.stringify(d)); window.open('/preview', '_blank'); }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />Preview
          </button>

          {/* Save Draft */}
          <button
            onClick={doSaveDraft} disabled={saving}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />Save Draft
          </button>

          {/* Publish */}
          <button
            onClick={doPublish} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-white rounded-xl shadow-md shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" />
            <span className="hidden xs:inline">{isEdit ? 'Update' : 'Publish'}</span>
          </button>

          {/* Mobile: sidebar toggle */}
          <button
            onClick={() => setMobileSidebar(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Post Settings"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop: sidebar collapse */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="hidden md:flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── Main area: editor + sidebar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Editor column ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Title area — prominent, above toolbar */}
          <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-8 lg:px-16 pt-6 pb-4">
            <textarea
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter a soulful title…"
              rows={1}
              className="pf-title-input w-full bg-transparent border-none focus:outline-none text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 resize-none leading-tight"
              style={{ fontFamily: "'Cinzel Decorative', serif", letterSpacing: '0.02em', color: '#1c0b00' }}
            />
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${postStatus === 'PUBLISHED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{postStatus}</span>
              <span>{meta.contentType}</span>
              {meta.series && <span>· {seriesList.find(s => s.id === meta.series)?.title || meta.series}</span>}
            </div>
          </div>

          {/* Toolbar */}
          <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
            <Toolbar />
          </div>

          {/* Editor canvas */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
              <div className="prose prose-slate prose-lg max-w-none">
                <div
                  ref={editorRef}
                  className="pf-editor min-h-[55vh] text-lg leading-relaxed focus:ring-0 focus:outline-none"
                  contentEditable
                  dir="ltr"
                  suppressContentEditableWarning
                  onInput={handleChange}
                  onBlur={handleChange}
                  style={{
                    fontFamily: fontFamily === 'Inter' ? 'Inter, sans-serif' : fontFamily,
                    fontSize: `${fontSize}px`,
                    color: textColor,
                    letterSpacing: `${letterSpacing}px`,
                    lineHeight,
                    wordSpacing: wordSpacing ? `${wordSpacing}px` : undefined,
                    fontWeight,
                    columnCount: columnCount > 1 ? columnCount : undefined,
                    columnGap: columnCount > 1 ? '24px' : undefined,
                    fontVariant: smallCaps ? 'small-caps' : undefined,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Desktop Sidebar ── */}
        <aside
          className={`hidden md:flex flex-col w-72 xl:w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto pf-sidebar transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full w-0 overflow-hidden border-0'}`}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* ── Mobile Bottom Sheet Sidebar ── */}
      {mobileSidebar && (
        <div className="pf-sidebar-sheet md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebar(false)} />
          <div className="pf-sidebar-sheet-panel dark:bg-slate-900">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Post Settings</h3>
              <button onClick={() => setMobileSidebar(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ── Scripture Float Button ── */}
      {floatPos && !showScripture && (
        <button
          ref={floatBtnRef}
          type="button"
          onMouseDown={onFloatMouseDown}
          onClick={onFloatClick}
          className="pf-scripture-btn"
          style={{ position: 'fixed', left: floatPos.x, top: floatPos.y, zIndex: 9990, cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        >
          <span className="pf-scripture-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </span>
          <span className="text-sm">Scripture</span>
          <span className="pf-ripple" />
        </button>
      )}

      {/* ── Scripture Lookup Modal ── */}
      {showScripture && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => { if (e.target === e.currentTarget) { setShowScripture(false); setScriptureQuery(''); setLiveResults([]); } }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col" style={{ height: '85vh' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Scripture Lookup</h2>
                <span className="text-xs text-slate-400">KJV · 31,102 verses</span>
              </div>
              <button onClick={() => { setShowScripture(false); setScriptureQuery(''); setLiveResults([]); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder='e.g. "John 3:16", "Psalm 23", "faith"'
                  value={scriptureQuery}
                  onChange={e => handleScriptureQuery(e.target.value)}
                  autoFocus
                />
                {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
              </div>

              {searchHistory.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {searchHistory.map(h => (
                    <button key={h} onClick={() => handleScriptureQuery(h)} className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1">
                      {h}
                      <span onClick={ev => { ev.stopPropagation(); setSearchHistory(p => p.filter(x => x !== h)); }} className="opacity-60 hover:opacity-100 text-[9px]" role="button">×</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter:</span>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
                  {[{ l: 'All', v: '' }, { l: 'OT', v: 'OT' }, { l: 'NT', v: 'NT' }].map(o => (
                    <button key={o.v} onClick={() => { setSearchTestament(o.v); if (scriptureQuery.trim()) { setIsSearching(true); setLiveResults(getScriptureResults(scriptureQuery, searchBook, o.v, 50)); setIsSearching(false); } }}
                      className={`px-3 py-1.5 transition-colors ${searchTestament === o.v ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'}`}>{o.l}</button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-[130px]">
                  <select value={searchBook} onChange={e => { setSearchBook(e.target.value); if (scriptureQuery.trim()) { setIsSearching(true); setLiveResults(getScriptureResults(scriptureQuery, e.target.value, searchTestament, 50)); setIsSearching(false); } }}
                    className="w-full appearance-none text-xs pl-2.5 pr-6 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    <option value="">All 66 Books</option>
                    <optgroup label="— Old Testament —">{(getBooks('KJV') || []).filter((b: any) => b.testament === 'OT').map((b: any) => <option key={b.number} value={b.name}>{b.name}</option>)}</optgroup>
                    <optgroup label="— New Testament —">{(getBooks('KJV') || []).filter((b: any) => b.testament === 'NT').map((b: any) => <option key={b.number} value={b.name}>{b.name}</option>)}</optgroup>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
                {(searchBook || searchTestament) && (
                  <button onClick={() => { setSearchBook(''); setSearchTestament(''); }} className="flex items-center gap-1 text-xs px-2 py-1 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
                    <X className="w-3 h-3" />Clear
                  </button>
                )}
              </div>

              {scriptureQuery.trim() && !isSearching && (
                <p className="text-xs text-slate-400">
                  {totalMatches === 0 ? 'No matches' : liveResults.length < totalMatches ? `Showing ${liveResults.length} of ${totalMatches.toLocaleString()} matches` : `${totalMatches.toLocaleString()} match${totalMatches !== 1 ? 'es' : ''}`}
                </p>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
              {!scriptureQuery.trim() && (
                <div className="text-center py-14">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">Search the entire Bible</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600 mt-1 max-w-xs mx-auto">Type a reference like <span className="text-primary">John 3:16</span> or keyword like <span className="text-primary">faith</span></p>
                </div>
              )}
              {scriptureQuery.trim() && liveResults.length === 0 && !isSearching && (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-400">No verses found for "{scriptureQuery}"</p>
                  {(searchBook || searchTestament) && <button onClick={() => { setSearchBook(''); setSearchTestament(''); }} className="mt-2 text-xs text-primary underline">Try all books</button>}
                </div>
              )}
              {liveResults.map((r, i) => (
                <div key={i}
                  className="group flex gap-3 p-3.5 rounded-xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => insertScripture(r.reference, r.text)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary tracking-wide">{r.reference}</span>
                      {r.type === 'keyword' && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full">keyword</span>}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 font-serif italic">"{r.text}"</p>
                  </div>
                  <button
                    onClick={ev => { ev.stopPropagation(); insertScripture(r.reference, r.text); }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 whitespace-nowrap"
                  >Insert</button>
                </div>
              ))}
              {liveResults.length < totalMatches && (
                <div className="pt-2 pb-4 text-center">
                  <button
                    onClick={() => { const nl = displayLimit + 50; setDisplayLimit(nl); setLiveResults(getScriptureResults(scriptureQuery, searchBook, searchTestament, nl)); }}
                    className="px-6 py-2.5 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors"
                  >Load 50 more <span className="ml-1 text-xs text-slate-400">({(totalMatches - liveResults.length).toLocaleString()} remaining)</span></button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Other Modals ── */}
      <LinkModal isOpen={showLink} onClose={() => setShowLink(false)} onInsert={insertLink} />
      <ImageModal isOpen={showImage} onClose={() => setShowImage(false)} onInsert={insertImage} />
      <TableModal isOpen={showTable} onClose={() => setShowTable(false)} onInsert={insertTable} />
      <FindReplaceModal isOpen={showFindReplace} onClose={() => setShowFindReplace(false)} onFind={handleFind} onReplace={handleReplace} />
      <SpecialCharsModal isOpen={showSpecialChars} onClose={() => setShowSpecialChars(false)} onInsert={c => exec('insertText', c)} />
      <StatisticsModal isOpen={showStats} onClose={() => setShowStats(false)} content={content} />
      <TemplateModal isOpen={showTemplates} onClose={() => setShowTemplates(false)} onSelect={t => setContent(t.content)} />
    </div>
  );
};

export default PostForm;