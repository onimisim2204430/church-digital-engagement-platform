import React from 'react';
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiGlobe,
  FiGrid,
  FiHelpCircle,
  FiLink,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiMoon,
  FiPlayCircle,
  FiSettings,
  FiShield,
  FiSun,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiX,
  FiZap,
  FiBell,
  FiBellOff,
  FiHeart,
} from 'react-icons/fi';
import { MdVolunteerActivism } from 'react-icons/md';
import { PiHandCoins } from 'react-icons/pi';
import type { IconType } from 'react-icons';

export type MemberIconName =
  | 'dashboard'
  | 'sermons'
  | 'events'
  | 'community'
  | 'prayer'
  | 'giving'
  | 'chat'
  | 'settings'
  | 'close'
  | 'public'
  | 'admin'
  | 'logout'
  | 'menu'
  | 'sun'
  | 'moon'
  | 'notifications'
  | 'notificationsOff'
  | 'chevronDown'
  | 'chevronRight'
  | 'user'
  | 'arrowRight'
  | 'clock'
  | 'verified'
  | 'trendUp'
  | 'trendDown'
  | 'spark'
  | 'help'
  | 'link'
  | 'external'
  | 'heart';

const ICON_MAP: Record<MemberIconName, IconType> = {
  dashboard: FiGrid,
  sermons: FiPlayCircle,
  events: FiCalendar,
  community: FiUsers,
  prayer: MdVolunteerActivism,
  giving: PiHandCoins,
  chat: FiMessageSquare,
  settings: FiSettings,
  close: FiX,
  public: FiGlobe,
  admin: FiShield,
  logout: FiLogOut,
  menu: FiMenu,
  sun: FiSun,
  moon: FiMoon,
  notifications: FiBell,
  notificationsOff: FiBellOff,
  chevronDown: FiChevronDown,
  chevronRight: FiChevronRight,
  user: FiUser,
  arrowRight: FiArrowRight,
  clock: FiClock,
  verified: FiCheckCircle,
  trendUp: FiTrendingUp,
  trendDown: FiTrendingDown,
  spark: FiZap,
  help: FiHelpCircle,
  link: FiLink,
  external: FiArrowRight,
  heart: FiHeart,
};

interface MemberIconProps {
  name: MemberIconName;
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}

const MemberIcon: React.FC<MemberIconProps> = ({
  name,
  size = 20,
  color,
  className,
  ariaLabel,
}) => {
  const IconComponent = (ICON_MAP[name] ?? FiHelpCircle) as unknown as React.ComponentType<{
    size?: number;
    color?: string;
    className?: string;
    strokeWidth?: number;
    'aria-label'?: string;
    'aria-hidden'?: boolean;
    focusable?: string;
  }>;

  return React.createElement(IconComponent, {
    size,
    color,
    className,
    strokeWidth: 1.5,
    'aria-label': ariaLabel,
    'aria-hidden': ariaLabel ? undefined : true,
    focusable: 'false',
  });
};

export default MemberIcon;
