import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
  size?: 'sm' | 'md';
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, size = 'md' }) => {
  const width = size === 'sm' ? 'w-9' : 'w-11';
  const height = size === 'sm' ? 'h-5' : 'h-6';
  const dotSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const translateX = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex ${width} ${height} items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
        enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block ${dotSize} transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? translateX : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

export default React.memo(Toggle);
