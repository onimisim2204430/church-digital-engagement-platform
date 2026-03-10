import React from 'react';
import Icon from '../../../components/common/Icon';

interface SettingsHeaderProps {
  title: string;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({ title }) => (
  <header 
    className="z-20 px-8 py-4 flex-shrink-0"
    style={{
      background: 'var(--admin-bg-primary)',
      borderBottom: '1px solid var(--admin-border)',
    }}
  >
    <div className="flex items-center justify-between">
      <h1 
        className="text-2xl font-bold"
        style={{
          color: 'var(--admin-text-primary)',
        }}
      >
        {title}
      </h1>
      <div className="flex items-center gap-4">
        <button 
          className="p-2 relative"
          style={{
            color: 'var(--admin-text-secondary)',
          }}
        >
          <Icon name="notifications" size={20} />
          <span 
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{
              background: 'var(--admin-error)',
              border: '2px solid var(--admin-bg-primary)',
            }}
          />
        </button>
        <button 
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: 'var(--admin-primary)',
            color: 'white',
            boxShadow: 'var(--admin-shadow-lg)',
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  </header>
);

export default React.memo(SettingsHeader);
