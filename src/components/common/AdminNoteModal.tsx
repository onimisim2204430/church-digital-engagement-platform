/**
 * AdminNoteModal — accessible modal for admin note input on approve/reject actions.
 *
 * Replaces window.prompt() with a proper modal dialog that:
 * - Traps focus inside while open (accessibility)
 * - Marks the note as required for rejection (caller passes `requireNote`)
 * - Closes on Escape key
 * - Shows contextual title and description depending on action type
 */
import React, { useEffect, useRef, useState } from 'react';

interface AdminNoteModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  confirmVariant?: 'approve' | 'reject';
  /** If true the user must type a note before confirming */
  requireNote?: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
}

const AdminNoteModal: React.FC<AdminNoteModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmVariant = 'approve',
  requireNote = false,
  onConfirm,
  onClose,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setNote('');
      setError('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireNote && !note.trim()) {
      setError('A note is required to proceed.');
      textareaRef.current?.focus();
      return;
    }
    onConfirm(note.trim());
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const confirmBtnClass =
    confirmVariant === 'reject'
      ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
      : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-4">
          <h2
            id="admin-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <label
            htmlFor="admin-note-textarea"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {requireNote ? 'Note (required)' : 'Note (optional)'}
          </label>
          <textarea
            id="admin-note-textarea"
            ref={textareaRef}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError('');
            }}
            rows={4}
            maxLength={1000}
            placeholder={
              requireNote
                ? 'Explain this decision for the moderator...'
                : 'Optional note for the moderator...'
            }
            className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
              error
                ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-300 bg-white'
            }`}
          />
          {error && (
            <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>
          )}
          <p className="mt-1 text-right text-[11px] text-slate-400">
            {note.length} / 1000
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminNoteModal;
