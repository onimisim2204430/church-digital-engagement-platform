import React from 'react';
import Icon from '../../../components/common/Icon';
import Toggle from '../components/Toggle';

interface SecurityTabProps {
  passwordLength: number;
  onDecreasePasswordLength: () => void;
  onIncreasePasswordLength: () => void;
}

const SecurityTab: React.FC<SecurityTabProps> = ({
  passwordLength,
  onDecreasePasswordLength,
  onIncreasePasswordLength,
}) => {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Security Configuration</h2>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Authentication Policy</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Email Verification</p>
              <p className="text-sm text-slate-500 mt-1">Require users to verify their email before access</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">User Registration</p>
              <p className="text-sm text-slate-500 mt-1">Allow new users to create accounts via the portal</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-sm text-slate-500 mt-1">Require 2FA for all administrator accounts</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Password Requirements</h3>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Minimum Length:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onDecreasePasswordLength}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50"
              >
                <Icon name="remove" size={14} />
              </button>
              <span className="w-12 text-center font-semibold">{passwordLength}</span>
              <button
                onClick={onIncreasePasswordLength}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50"
              >
                <Icon name="add" size={14} />
              </button>
              <span className="text-sm text-slate-500 ml-2">characters</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Required Characters:</p>
            <div className="grid grid-cols-2 gap-3">
              {['Uppercase (A-Z)', 'Numbers (0-9)', 'Special (!@#)', 'No Common Words'].map((requirement) => (
                <label
                  key={requirement}
                  className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary" defaultChecked={requirement !== 'No Common Words'} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{requirement}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SecurityTab);
