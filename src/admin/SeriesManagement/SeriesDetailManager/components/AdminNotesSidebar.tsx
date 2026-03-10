/**
 * AdminNotesSidebar.tsx — restyled to admin design system. Logic preserved.
 */
import React, { useState } from 'react';
import Icon from '../../../../components/common/Icon';

interface AdminNotesSidebarProps {
  initialValue?: string;
  onSave?: (value: string) => void;
}

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

const AdminNotesSidebar: React.FC<AdminNotesSidebarProps> = ({ initialValue = '', onSave }) => {
  const [adminNotes, setAdminNotes] = useState(initialValue);

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg1)' }}>
        <Icon name="sticky_note_2" size={14} style={{ color: 'var(--em)' } as any} />
        <span style={{ fontFamily: syne, fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Admin Notes</span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <textarea
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          placeholder="Add internal notes for other admins…"
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '9px 11px', resize: 'vertical',
            background: 'var(--bg3)', border: '1px solid var(--border-color)', borderRadius: 8,
            color: 'var(--text-primary)', fontFamily: mono, fontSize: 11.5, lineHeight: 1.55, outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--em)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={() => onSave?.(adminNotes)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--em)', fontFamily: mono, fontSize: 11, fontWeight: 700 }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
          >
            <Icon name="save" size={12} />
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AdminNotesSidebar);