import React from 'react';

const AppearanceTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Appearance</h2>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Theme Mode</label>
            <div className="flex gap-4">
              {['Light', 'Dark', 'System'].map((theme) => (
                <button
                  key={theme}
                  className={`flex-1 p-3 rounded-lg border-2 ${theme === 'Light' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'} transition-colors`}
                >
                  <span className={`text-sm font-medium ${theme === 'Light' ? 'text-primary' : 'text-slate-600'}`}>{theme}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Brand Color</label>
            <div className="flex items-center gap-4">
              <input type="color" defaultValue="#2268f5" className="w-12 h-12 rounded-lg border border-slate-200" />
              <input type="text" defaultValue="#2268f5" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AppearanceTab);
