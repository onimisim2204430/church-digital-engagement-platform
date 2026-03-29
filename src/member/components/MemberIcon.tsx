/**
 * MemberIcon — Sovereign Icon Component
 * SOVEREIGN: zero shared imports from admin or public icon systems.
 *
 * Uses react-icons (fi = Feather, md = Material Design, pi = Phosphor).
 * Consistent 1.5px stroke weight across all icons.
 * Every icon that appears alone MUST have an ariaLabel.
 */

import React from 'react';
import {
  FiCamera,
  FiArrowLeft,
  FiArrowRight,
  FiBell,
  FiBellOff,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEdit3,
  FiExternalLink,
  FiGlobe,
  FiGrid,
  FiHeart,
  FiHelpCircle,
  FiImage,
  FiInfo,
  FiLink,
  FiLock,
  FiLogOut,
  FiMail,
  FiMenu,
  FiMessageSquare,
  FiMic,
  FiMoon,
  FiMoreHorizontal,
  FiPaperclip,
  FiPhone,
  FiPlayCircle,
  FiSearch,
  FiSend,
  FiSettings,
  FiShield,
  FiSlash,
  FiSmile,
  FiSun,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiUpload,
  FiUser,
  FiUsers,
  FiVideo,
  FiX,
  FiXCircle,
  FiZap,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiAlertTriangle,
  FiMonitor,
  FiFileText,
  FiCreditCard,
  FiDownload,
  FiBarChart2,
  FiVolume2,
} from 'react-icons/fi';
import {
  MdVolunteerActivism,
  MdDone,
  MdDoneAll,
  MdHourglassTop,
  MdSchedule,
  MdForum,
  MdHandshake,
  MdGroup,
  MdBadge,
  MdEvent,
  MdErrorOutline,
  MdReceiptLong,
  MdCampaign,
  MdPalette,
} from 'react-icons/md';
import { PiHandCoins } from 'react-icons/pi';
import type { IconType } from 'react-icons';

/* ── Icon name union ── */
export type MemberIconName =
  /* Navigation */
  | 'dashboard'
  | 'sermons'
  | 'events'
  | 'community'
  | 'prayer'
  | 'giving'
  | 'chat'
  | 'settings'
  | 'public'
  | 'admin'
  /* Actions */
  | 'close'
  | 'menu'
  | 'logout'
  | 'search'
  | 'searchOff'
  | 'edit'
  | 'editSquare'
  | 'delete'
  | 'upload'
  | 'send'
  | 'arrowRight'
  | 'arrowLeft'
  | 'chevronDown'
  | 'chevronRight'
  | 'external'
  | 'link'
  | 'more'
  /* Status / Info */
  | 'user'
  | 'verified'
  | 'info'
  | 'help'
  | 'error'
  | 'errorOutline'
  | 'warning'
  | 'check'
  | 'checkCircle'
  | 'xCircle'
  | 'cancel'
  /* Media / Chat */
  | 'camera'
  | 'call'
  | 'videocam'
  | 'mic'
  | 'emoji'
  | 'attach'
  | 'image'
  /* Notifications */
  | 'notifications'
  | 'notificationsOff'
  /* Time */
  | 'clock'
  | 'schedule'
  | 'hourglassTop'
  /* Trends */
  | 'trendUp'
  | 'trendDown'
  | 'spark'
  /* Theme */
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'palette'
  /* Security */
  | 'lock'
  | 'mail'
  | 'eye'
  | 'eyeOff'
  | 'badge'
  | 'block'
  /* Data */
  | 'receiptLong'
  | 'creditCard'
  | 'fileText'
  /* Groups */
  | 'group'
  | 'handshake'
  | 'forum'
  | 'event'
  /* Read receipts */
  | 'done'
  | 'doneAll'
  /* Misc */
  | 'heart'
  | 'person'
  | 'playCircle'
  | 'volunteerActivism'
  /* Settings-specific */
  | 'campaign'
  | 'alarm'
  | 'analytics'
  | 'download'
  | 'darkMode'
  | 'email';

/* ── Mapping every name to a react-icon ── */
const ICON_MAP: Record<MemberIconName, IconType> = {
  /* Navigation */
  dashboard:       FiGrid,
  sermons:         FiPlayCircle,
  events:          FiCalendar,
  community:       FiUsers,
  prayer:          MdVolunteerActivism,
  giving:          PiHandCoins,
  chat:            FiMessageSquare,
  settings:        FiSettings,
  public:          FiGlobe,
  admin:           FiShield,
  /* Actions */
  close:           FiX,
  menu:            FiMenu,
  logout:          FiLogOut,
  search:          FiSearch,
  searchOff:       FiXCircle,
  edit:            FiEdit3,
  editSquare:      FiEdit2,
  delete:          FiTrash2,
  upload:          FiUpload,
  send:            FiSend,
  arrowRight:      FiArrowRight,
  arrowLeft:       FiArrowLeft,
  chevronDown:     FiChevronDown,
  chevronRight:    FiChevronRight,
  external:        FiExternalLink,
  link:            FiLink,
  more:            FiMoreHorizontal,
  /* Status / Info */
  user:            FiUser,
  person:          FiUser,
  verified:        FiCheckCircle,
  info:            FiInfo,
  help:            FiHelpCircle,
  error:           FiXCircle,
  errorOutline:    MdErrorOutline,
  warning:         FiAlertTriangle,
  check:           FiCheck,
  checkCircle:     FiCheckCircle,
  xCircle:         FiXCircle,
  cancel:          FiXCircle,
  /* Media / Chat */
  camera:      FiCamera,
  call:            FiPhone,
  videocam:        FiVideo,
  mic:             FiMic,
  emoji:           FiSmile,
  attach:          FiPaperclip,
  image:           FiImage,
  /* Notifications */
  notifications:   FiBell,
  notificationsOff: FiBellOff,
  /* Time */
  clock:           FiClock,
  schedule:        MdSchedule,
  hourglassTop:    MdHourglassTop,
  /* Trends */
  trendUp:         FiTrendingUp,
  trendDown:       FiTrendingDown,
  spark:           FiZap,
  /* Theme */
  sun:             FiSun,
  moon:            FiMoon,
  monitor:         FiMonitor,
  palette:         MdPalette,
  /* Security */
  lock:            FiLock,
  mail:            FiMail,
  eye:             FiEye,
  eyeOff:          FiEyeOff,
  badge:           MdBadge,
  block:           FiSlash,
  /* Data */
  receiptLong:     MdReceiptLong,
  creditCard:      FiCreditCard,
  fileText:        FiFileText,
  /* Groups */
  group:           MdGroup,
  handshake:       MdHandshake,
  forum:           MdForum,
  event:           MdEvent,
  /* Read receipts */
  done:            MdDone,
  doneAll:         MdDoneAll,
  /* Misc */
  heart:           FiHeart,
  playCircle:      FiPlayCircle,
  volunteerActivism: MdVolunteerActivism,
  /* Settings-specific */
  campaign:        MdCampaign,
  alarm:           FiVolume2,
  analytics:       FiBarChart2,
  download:        FiDownload,
  darkMode:        FiMoon,
  email:           FiMail,
};

/* ── Props ── */
interface MemberIconProps {
  name: MemberIconName;
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

/* ── Component ── */
const MemberIcon: React.FC<MemberIconProps> = ({
  name,
  size = 20,
  color,
  className,
  ariaLabel,
  ariaHidden,
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
    'aria-hidden': ariaLabel ? undefined : (ariaHidden ?? true),
    focusable: 'false',
  });
};

export default MemberIcon;
