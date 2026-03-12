/**
 * DeleteModal — Confirmation modal for deleting a giving item
 * Lazy-loaded and memoized
 */

import React, { memo, useState } from 'react';
import Icon from '../../../components/common/Icon';
import type { GivingItem } from '../types/giving.types';

interface DeleteModalProps {
  item: GivingItem;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteModal = memo<DeleteModalProps>(({ item, onClose, onConfirm }) => {
  const [confirmInput, setConfirmInput] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <Icon name="delete_forever" size={20} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete Giving Item</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">This action is permanent and cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          You are about to permanently delete <strong className="text-slate-900 dark:text-slate-100">"{item.title}"</strong>. All associated data and donation records will be detached.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          To confirm, type <strong className="text-slate-800 dark:text-slate-200">{item.title}</strong> below:
        </p>
        <input
          type="text"
          value={confirmInput}
          onChange={e => setConfirmInput(e.target.value)}
          onPaste={e => e.preventDefault()}
          placeholder={item.title}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm mb-5 focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-900 dark:text-slate-200"
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={confirmInput !== item.title}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});

DeleteModal.displayName = 'DeleteModal';

export default DeleteModal;
