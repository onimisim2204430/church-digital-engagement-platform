import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Icon from '../../components/common/Icon';
import './AdminTopBar.css';

interface TopBarProps {
  onMenuClick?: () => void;
}

const AdminTopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border-light bg-white px-4 z-50 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded p-1.5 text-slate-soft hover:bg-slate-100 hover:text-primary transition-colors lg:hidden"
            aria-label="Toggle menu"
          >
            <Icon name="menu" size={16} />
          </button>
        )}
        <div className="flex items-center gap-3 text-primary">
          <Icon name="spa" size={20} className="text-primary" />
          <h1 className="font-display font-semibold text-sm tracking-tight text-slate-deep hidden sm:block">
            Serene Sanctuary
          </h1>
        </div>
        <div className="h-6 w-px bg-border-light hidden md:block"></div>
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider">System: Online</span>
          </div>
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-xl px-6 hidden sm:block">
        <div className="relative w-full">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-soft" />
          <input
            className="w-full rounded border border-border-light bg-slate-50 py-1.5 pl-10 pr-12 text-xs focus:border-primary focus:outline-none placeholder:text-slate-400 text-slate-deep"
            placeholder="Search admin (Ctrl+K)"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <kbd className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-soft font-sans border border-border-light">Ctrl</kbd>
            <kbd className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-soft font-sans border border-border-light">K</kbd>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded p-2 text-slate-soft hover:bg-slate-100 hover:text-primary transition-colors"
            aria-label="Notifications"
          >
            <Icon name="notifications" size={16} />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 border-2 border-white"></span>
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border-light bg-white shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
                <h3 className="text-xs font-bold text-slate-deep">Notifications</h3>
                <button className="text-xs text-primary font-semibold hover:underline">Mark all read</button>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { title: 'New comment awaiting moderation', time: '5 mins ago', unread: true },
                  { title: 'New member registration', time: '1 hour ago', unread: true },
                  { title: 'System backup completed', time: '3 hours ago', unread: false },
                ].map((n, i) => (
                  <div key={i} className={`flex gap-3 px-4 py-3 ${n.unread ? 'bg-blue-50/40' : ''}`}>
                    {n.unread && <div className="mt-1.5 size-1.5 rounded-full bg-primary flex-shrink-0"></div>}
                    <div className={n.unread ? '' : 'pl-3'}>
                      <p className="text-xs text-slate-deep">{n.title}</p>
                      <p className="text-xs text-slate-soft mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-border-light">
                <button className="w-full text-center text-xs text-primary font-semibold hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/admin/settings')}
          className="rounded p-2 text-slate-soft hover:bg-slate-100 hover:text-primary transition-colors"
          aria-label="Help"
        >
          <Icon name="help" size={16} />
        </button>

        <div className="w-px h-6 bg-border-light mx-1"></div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-deep leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-soft uppercase font-semibold mt-0.5">{user?.role}</p>
            </div>
            <div className="size-8 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
              {getUserInitials()}
            </div>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border-light bg-white shadow-lg z-50">
              <div className="px-4 py-3 border-b border-border-light">
                <p className="text-xs font-bold text-slate-deep">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-soft mt-0.5">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate('/admin/settings'); setShowUserMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-xs text-slate-deep hover:bg-slate-50 transition-colors"
                >
                  <Icon name="settings" size={14} className="text-slate-soft" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => { navigate('/'); setShowUserMenu(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-xs text-slate-deep hover:bg-slate-50 transition-colors"
                >
                  <Icon name="public" size={14} className="text-slate-soft" />
                  <span>Public Site</span>
                </button>
                <div className="border-t border-border-light my-1"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Icon name="logout" size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
