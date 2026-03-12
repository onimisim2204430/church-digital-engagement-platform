/**
 * EditTab.tsx — restyled to admin design system
 * All logic 100% preserved. Only CSS classes replaced with CSS vars / inline styles.
 */
import React from 'react';
import ImageUploadInput from '../../../components/ImageUploadInput';
import { SERIES_VISIBILITY_OPTIONS } from '../../../../services/series.service';
import Icon from '../../../../components/common/Icon';
import { EditForm } from '../types/series-detail.types';

interface EditTabProps {
  isCreateMode:     boolean;
  editForm:         EditForm;
  onFormChange:     (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onFormFieldChange:(field: keyof EditForm, value: any) => void;
  onSave:           () => void;
  onDiscard:        () => void;
  onNavigate?:      (path: string) => void;
  editSaving?:      boolean;
  editError?:       string;
  editSuccess?:     boolean;
  createSuccess?:   boolean;
}

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

/* ── reusable sub-components ──────────────────────────────────── */
const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label style={{ display: 'block', fontFamily: mono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-secondary)', marginBottom: 8 }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
  </label>
);

const FieldHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5, marginBottom: 0 }}>{children}</p>
);

const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  background: 'var(--bg3)', border: '1px solid var(--border-color)', borderRadius: 8,
  color: 'var(--text-primary)', fontFamily: mono, fontSize: 13, outline: 'none',
  transition: 'border-color .14s ease',
};

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', ...style }}>
    {children}
  </div>
);

const CardHead: React.FC<{ icon: string; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg1)' }}>
    <Icon name={icon} size={16} style={{ color: 'var(--em)' } as any} />
    <div>
      <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</p>
      <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>{sub}</p>
    </div>
  </div>
);

const Banner: React.FC<{ type: 'success' | 'error'; children: React.ReactNode }> = ({ type, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
    background: type === 'success' ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
    border: `1px solid ${type === 'success' ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
    fontFamily: mono, fontSize: 12, color: type === 'success' ? 'var(--em)' : '#f87171',
  }}>
    <Icon name={type === 'success' ? 'check_circle' : 'error_outline'} size={16} />
    <div>{children}</div>
  </div>
);

/* ── Visibility option ─────────────────────────────────────────── */
const VISIBILITY_ICONS: Record<string, string> = { PUBLIC: 'public', MEMBERS_ONLY: 'group', HIDDEN: 'visibility_off' };
const VISIBILITY_DESCS: Record<string, string> = {
  PUBLIC: 'Anyone can discover and view',
  MEMBERS_ONLY: 'Authenticated members only',
  HIDDEN: 'Hidden from all listings',
};

/* ── Toggle ──────────────────────────────────────────────────── */
const Toggle: React.FC<{ checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; disabled?: boolean }> = ({ checked, onChange, name, disabled }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, flexShrink: 0, cursor: disabled ? 'default' : 'pointer' }}>
    <input type="checkbox" name={name} checked={checked} onChange={onChange} disabled={disabled} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
    <span style={{ position: 'absolute', inset: 0, borderRadius: 22, background: checked ? 'var(--em)' : 'var(--bg4, #1e2d45)', transition: 'background .2s ease', opacity: disabled ? .5 : 1 }} />
    <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .18s ease' }} />
  </label>
);

/* ═══ Component ═══════════════════════════════════════════════════ */
const EditTab: React.FC<EditTabProps> = React.memo(({
  isCreateMode, editForm, onFormChange, onFormFieldChange, onSave, onDiscard,
  onNavigate, editSaving = false, editError = '', editSuccess = false, createSuccess = false,
}) => {

  /* ── Create mode ───────────────────────────────────────────── */
  if (isCreateMode) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {createSuccess && (
          <div style={{ marginBottom: 16 }}>
            <Banner type="success">
              <p style={{ fontWeight: 700, margin: 0 }}>Series created successfully!</p>
              <p style={{ fontSize: 10, opacity: .8, margin: '2px 0 0' }}>Redirecting to the new series page…</p>
            </Banner>
          </div>
        )}
        {editError && <div style={{ marginBottom: 16 }}><Banner type="error">{editError}</Banner></div>}

        <Card>
          <CardHead icon="add_circle" title="Series Details" sub="Fill in the information below to create a new series" />
          <div style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Title */}
            <div>
              <FieldLabel required>Title</FieldLabel>
              <input
                type="text" name="title" value={editForm.title} onChange={onFormChange}
                disabled={editSaving || createSuccess}
                placeholder="e.g., The Divine Renovation: Rebuilding the Temple of Your Heart"
                style={{ ...inputBase, fontSize: 14, fontWeight: 600 }}
                onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
                autoFocus
              />
              <FieldHint>The public-facing name of the series</FieldHint>
            </div>

            {/* Description */}
            <div>
              <FieldLabel>Description</FieldLabel>
              <textarea
                name="description" value={editForm.description} onChange={onFormChange}
                disabled={editSaving || createSuccess} rows={5}
                placeholder="Describe what this series is about, its themes, and who it's for…"
                style={{ ...inputBase, resize: 'vertical', lineHeight: 1.55 }}
                onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
              />
              <FieldHint>Shown on the public series page — helps members understand what to expect</FieldHint>
            </div>

            {/* Cover image */}
            <div>
              <FieldLabel>Cover Image</FieldLabel>
              <ImageUploadInput
                value={editForm.cover_image || ''}
                onChange={(url: string) => onFormFieldChange('cover_image', url)}
                disabled={editSaving || createSuccess}
              />
              <FieldHint>Recommended: 1280 × 720 px (16:9), JPG or PNG</FieldHint>
            </div>

            {/* Visibility */}
            <div>
              <FieldLabel>Visibility</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
                {SERIES_VISIBILITY_OPTIONS.map((opt: any) => {
                  const isActive = editForm.visibility === opt.value;
                  return (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                      border: `1px solid ${isActive ? 'var(--em)' : 'var(--border-color)'}`,
                      background: isActive ? 'var(--emd)' : 'var(--bg3)',
                      boxShadow: isActive ? '0 0 0 1px rgba(16,185,129,.2)' : 'none',
                      transition: 'all .14s ease',
                    }}>
                      <input type="radio" name="visibility" value={opt.value} checked={isActive} onChange={onFormChange}
                        disabled={editSaving || createSuccess} style={{ display: 'none' }} />
                      <Icon name={VISIBILITY_ICONS[opt.value]} size={17} style={{ color: isActive ? 'var(--em)' : 'var(--text-tertiary)', marginTop: 1, flexShrink: 0 } as any} />
                      <div>
                        <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: isActive ? 'var(--em)' : 'var(--text-primary)', margin: 0 }}>{opt.label}</p>
                        <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', margin: '3px 0 0' }}>{VISIBILITY_DESCS[opt.value]}</p>
                      </div>
                      {isActive && <Icon name="check_circle" size={14} style={{ color: 'var(--em)', marginLeft: 'auto', flexShrink: 0 } as any} />}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Featured */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Feature this series</p>
                  <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>Shown prominently on the homepage</p>
                </div>
                <Toggle name="is_featured" checked={editForm.is_featured} onChange={onFormChange} disabled={editSaving || createSuccess} />
              </div>
              {editForm.is_featured && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <FieldLabel>Display Priority</FieldLabel>
                    <input type="number" name="featured_priority" value={editForm.featured_priority}
                      onChange={onFormChange} min={0} max={100} disabled={editSaving || createSuccess}
                      style={{ ...inputBase, width: 72, textAlign: 'center', fontWeight: 700 }}
                      onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
                    />
                  </div>
                  <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Higher numbers appear earlier in featured lists</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={onSave} disabled={editSaving || createSuccess || !editForm.title.trim()}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'var(--em)', color: '#fff', fontFamily: mono, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: (editSaving || createSuccess || !editForm.title.trim()) ? .5 : 1 }}>
                <Icon name={editSaving ? 'hourglass_empty' : 'add_circle'} size={15} />
                {editSaving ? 'Creating…' : 'Create Series'}
              </button>
              <button onClick={() => onNavigate?.('/admin/series')} disabled={editSaving}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: mono, fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
            </div>
            <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              After creating, you'll be able to add posts, upload resources, and configure advanced settings.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /* ── Edit mode ─────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {editSuccess && <Banner type="success">Series updated successfully.</Banner>}
      {editError   && <Banner type="error">{editError}</Banner>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }} className="edit-tab-layout">
        {/* Left: title, description, cover */}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Card>
            <CardHead icon="edit" title="Series Details" sub="Update the public-facing information" />
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="edit-tab-grid">

              {/* Title + Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <FieldLabel required>Title</FieldLabel>
                  <input type="text" name="title" value={editForm.title} onChange={onFormChange} disabled={editSaving}
                    placeholder="e.g., The Divine Renovation" style={{ ...inputBase, fontWeight: 600 }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-color)')} />
                  <FieldHint>The public-facing name of the series</FieldHint>
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea name="description" value={editForm.description} onChange={onFormChange}
                    disabled={editSaving} rows={7} placeholder="Describe what this series is about…"
                    style={{ ...inputBase, resize: 'vertical', lineHeight: 1.55 }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border-color)')} />
                  <FieldHint>Shown on the public series page</FieldHint>
                </div>
              </div>

              {/* Cover image */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <FieldLabel>Cover Image</FieldLabel>
                <ImageUploadInput
                  value={editForm.cover_image || ''}
                  onChange={(url: string) => onFormFieldChange('cover_image', url)}
                  disabled={editSaving}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button type="button" disabled={editSaving}
                    style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--emd)', color: 'var(--em)', fontFamily: mono, fontSize: 11, fontWeight: 700 }}>
                    Replace
                  </button>
                  <button type="button" onClick={() => onFormFieldChange('cover_image', '')} disabled={editSaving}
                    style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,.1)', color: '#ef4444', fontFamily: mono, fontSize: 11, fontWeight: 700 }}>
                    Remove
                  </button>
                </div>
                <FieldHint>Recommended: 1280 × 720 px (16:9), JPG or PNG</FieldHint>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: sidebar */}
        <div style={{ width: '100%', maxWidth: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }} className="edit-tab-sidebar">

          {/* Visibility */}
          <Card>
            <CardHead icon="lock_open" title="Visibility" sub="Who can access this series" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SERIES_VISIBILITY_OPTIONS.map((opt: any) => {
                const isActive = editForm.visibility === opt.value;
                return (
                  <label key={opt.value} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${isActive ? 'var(--em)' : 'var(--border-color)'}`,
                    background: isActive ? 'var(--emd)' : 'var(--bg3)',
                    transition: 'all .13s ease',
                  }}>
                    <input type="radio" name="visibility" value={opt.value} checked={isActive} onChange={onFormChange} disabled={editSaving} style={{ display: 'none' }} />
                    <Icon name={VISIBILITY_ICONS[opt.value]} size={16} style={{ color: isActive ? 'var(--em)' : 'var(--text-tertiary)', flexShrink: 0 } as any} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: isActive ? 'var(--em)' : 'var(--text-primary)', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontFamily: mono, fontSize: 9.5, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{VISIBILITY_DESCS[opt.value]}</p>
                    </div>
                    {isActive && <Icon name="check_circle" size={14} style={{ color: 'var(--em)', flexShrink: 0 } as any} />}
                  </label>
                );
              })}
            </div>
          </Card>

          {/* Featured */}
          <Card>
            <CardHead icon="star" title="Featured" sub="Promote on the homepage" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Feature this series</p>
                  <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>Shown prominently to all visitors</p>
                </div>
                <Toggle name="is_featured" checked={editForm.is_featured} onChange={onFormChange} disabled={editSaving} />
              </div>
              {editForm.is_featured && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <FieldLabel>Display Priority</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="number" name="featured_priority" value={editForm.featured_priority}
                      onChange={onFormChange} min={0} max={100} disabled={editSaving}
                      style={{ ...inputBase, width: 64, textAlign: 'center', fontWeight: 700 }}
                      onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
                    />
                    <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>Higher = appears earlier in featured lists</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Save / discard */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={onSave} disabled={editSaving || !editForm.title.trim()}
              style={{ width: '100%', padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'var(--em)', color: '#fff', fontFamily: mono, fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: (editSaving || !editForm.title.trim()) ? .5 : 1 }}>
              <Icon name={editSaving ? 'hourglass_empty' : 'check'} size={14} />
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={onDiscard} disabled={editSaving}
              style={{ width: '100%', padding: '9px 0', borderRadius: 9, background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: mono, fontSize: 12.5, fontWeight: 600 }}>
              Discard Changes
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .edit-tab-layout { flex-direction: column !important; }
        @media (min-width: 1024px) {
          .edit-tab-layout { flex-direction: row !important; }
          .edit-tab-sidebar { max-width: 280px !important; }
        }
        @media (max-width: 700px) {
          .edit-tab-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
});

EditTab.displayName = 'EditTab';
export default EditTab;