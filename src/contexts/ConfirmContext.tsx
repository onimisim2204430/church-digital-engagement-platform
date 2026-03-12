/**
 * Confirmation Modal Context & Provider
 * 
 * Centralized confirmation system for all user actions.
 * Replaces window.confirm() with accessible, branded modals.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'neutral' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
  state: ConfirmState;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
};

const defaultState: ConfirmState = {
  isOpen: false,
  isLoading: false,
  error: null,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'neutral',
  onConfirm: () => {},
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState>(defaultState);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({
      ...defaultState,
      ...options,
      isOpen: true,
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      variant: options.variant || 'neutral',
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setState(defaultState);
  }, []);

  const handleConfirm = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await state.onConfirm();
      setState(defaultState); // Close on success
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  }, [state.onConfirm]);

  const handleCancel = useCallback(() => {
    if (state.onCancel) {
      state.onCancel();
    }
    closeConfirm();
  }, [state.onCancel, closeConfirm]);

  return (
    <ConfirmContext.Provider value={{ confirm, closeConfirm, state }}>
      {children}
      {state.isOpen && (
        <ConfirmModal
          {...state}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

interface ConfirmModalProps extends ConfirmState {
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant,
  isLoading,
  error,
  onConfirm,
  onCancel,
}) => {
  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onCancel();
    } else if (e.key === 'Enter' && !isLoading) {
      onConfirm();
    }
  };

  // Prevent background scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="confirm-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="confirm-modal">
        <div className="confirm-modal-header">
          <h2 id="confirm-title" className="confirm-modal-title">
            {variant === 'danger' && <span className="confirm-icon">⚠️</span>}
            {title}
          </h2>
        </div>

        <div className="confirm-modal-body">
          <p id="confirm-message" className="confirm-modal-message">
            {message}
          </p>
          {error && (
            <div className="confirm-modal-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="confirm-modal-footer">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-confirm-cancel"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn-confirm-action btn-confirm-${variant}`}
            aria-label={confirmLabel}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
