/**
 * SuggestedAmountsEditor — Manage quick-select donation amounts
 * Memoized to prevent re-renders when props don't change
 */

import React, { memo, useState } from 'react';
import Icon from '../../../components/common/Icon';

interface SuggestedAmountsEditorProps {
  amounts: number[];
  onChange: (amounts: number[]) => void;
  disabled?: boolean;
}

const SuggestedAmountsEditor = memo<SuggestedAmountsEditorProps>(({ amounts, onChange, disabled }) => {
  const [inputVal, setInputVal] = useState('');

  const add = () => {
    const n = parseInt(inputVal);
    if (!isNaN(n) && n > 0 && !amounts.includes(n)) {
      onChange([...amounts, n].sort((a, b) => a - b));
    }
    setInputVal('');
  };

  const remove = (amount: number) => onChange(amounts.filter(a => a !== amount));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {amounts.map(a => (
          <span key={a} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20">
            ${a}
            {!disabled && (
              <button onClick={() => remove(a)} className="ml-1 text-primary/60 hover:text-red-500 transition-colors">
                <Icon name="close" size={12} />
              </button>
            )}
          </span>
        ))}
        {amounts.length === 0 && <span className="text-xs text-slate-400 italic">No amounts set</span>}
      </div>
      {!disabled && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
            <input
              type="number"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
              placeholder="Add amount"
              className="w-32 pl-7 pr-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={add}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
});

SuggestedAmountsEditor.displayName = 'SuggestedAmountsEditor';

export default SuggestedAmountsEditor;
