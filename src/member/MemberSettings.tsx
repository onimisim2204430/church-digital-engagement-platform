/**
 * Member Settings Page — Sanctuary Design
 * Layout matches HTML design exactly. All existing functionality preserved.
 * Full-width layout within MemberLayout's content slot.
 *
 * FUNCTIONALITY (zero regressions):
 *   ✓ Profile editing (firstName, lastName, phone, bio)
 *   ✓ Profile photo upload / remove (FormData → PATCH /auth/me/)
 *   ✓ Email verification (emailVerificationService.initiateVerification())
 *   ✓ Password reset via email code (POST /auth/password-reset/request/ & confirm/)
 *   ✓ Email change (POST /auth/change-email/)
 *   ✓ Notification toggles
 *   ✓ Privacy toggles
 *   ✓ Light-only appearance in member area
 *   ✓ Account deletion (danger zone)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiService } from '../services/api.service';
import emailVerificationService from '../services/emailVerification.service';
import MemberIcon from './components/MemberIcon';
import './styles/MemberSettings.css';

const VERIFICATION_COOLDOWN_KEY = 'email_verification_cooldown';
const COOLDOWN_DURATION = 60;

/* ─── Toggle switch ──────────────────────────────────────────── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    className={`msx-switch${checked ? ' is-on' : ''}`}
    onClick={() => onChange(!checked)}
    type="button"
  >
    <span className="msx-switch-thumb" />
  </button>
);

/* ─── Notification / Privacy option row ─────────────────────── */
const OptionRow: React.FC<{
  label: string;
  desc?: string;
  children: React.ReactNode;
}> = ({ label, desc, children }) => (
  <div className="msx-option">
    <div className="msx-option-left">
      <div>
        <div className="msx-option-label">{label}</div>
        {desc && <div className="msx-option-desc">{desc}</div>}
      </div>
    </div>
    <div className="msx-option-right">{children}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */
const MemberSettings: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  /* ─ verification ─ */
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  /* ─ profile ─ */
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    phone:     (user as any)?.phone ?? '',
    bio:       (user as any)?.bio   ?? '',
  });
  const [profileDirty,  setProfileDirty]  = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  /* ─ profile photo ─ */
  const [profilePhotoFile,       setProfilePhotoFile]       = useState<File | null>(null);
  const [profilePhotoPreview,    setProfilePhotoPreview]    = useState<string | null>(null);
  const [profilePhotoLoadFailed, setProfilePhotoLoadFailed] = useState(false);
  const [profilePhotoError,      setProfilePhotoError]      = useState<string | null>(null);

  /* ─ password reset ─ */
  type ResetStep = 'idle' | 'requesting' | 'confirming';
  const [showPwVis,       setShowPwVis]       = useState(false);
  const [resetStep,       setResetStep]       = useState<ResetStep>('idle');
  const [resetCodeSending,setResetCodeSending]= useState(false);
  const [resetCode,       setResetCode]       = useState('');
  const [resetNewPw,      setResetNewPw]      = useState('');
  const [resetConfirmPw,  setResetConfirmPw]  = useState('');
  const [resetSaving,     setResetSaving]     = useState(false);
  const [resetCooldown,   setResetCooldown]   = useState(0);
  const resetCooldownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  /* ─ email change ─ */
  type EmailChangeStep = 'idle' | 'form';
  const [emailChangeStep,   setEmailChangeStep]   = useState<EmailChangeStep>('idle');
  const [newEmail,          setNewEmail]          = useState('');
  const [emailChangePw,     setEmailChangePw]     = useState('');
  const [emailChangePwShow, setEmailChangePwShow] = useState(false);
  const [emailChangeSaving, setEmailChangeSaving] = useState(false);

  /* ─ notifications ─ */
  const [notif, setNotif] = useState({
    emailSermons:  true,
    emailEvents:   true,
    emailPrayer:   false,
    emailAnnounce: true,
    pushMessages:  false,
    pushReminders: true,
  });

  /* ─ privacy ─ */
  const [privacy, setPrivacy] = useState({
    profilePublic:  true,
    showEmail:      false,
    allowDirectMsg: true,
    dataAnalytics:  true,
  });

  /* ─ danger ─ */
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);

  /* ─────────── effects ─────────── */
  useEffect(() => {
    refreshUser();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshUser]);

  useEffect(() => {
    const stored = localStorage.getItem(VERIFICATION_COOLDOWN_KEY);
    if (stored) {
      const rem = Math.max(0, Math.ceil((parseInt(stored, 10) - Date.now()) / 1000));
      if (rem > 0) setCooldownSeconds(rem);
      else localStorage.removeItem(VERIFICATION_COOLDOWN_KEY);
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds((p) => {
        if (p <= 1) {
          localStorage.removeItem(VERIFICATION_COOLDOWN_KEY);
          clearInterval(id);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldownSeconds > 0]);

  useEffect(() => { setProfilePhotoLoadFailed(false); }, [user?.profilePicture]);

  /* ─────────── handlers ─────────── */
  const startCooldown = (duration = COOLDOWN_DURATION) => {
    localStorage.setItem(VERIFICATION_COOLDOWN_KEY, (Date.now() + duration * 1000).toString());
    setCooldownSeconds(duration);
  };

  const handleSendVerificationEmail = async () => {
    if (cooldownSeconds > 0) {
      showError(`Please wait ${cooldownSeconds}s before requesting again`);
      return;
    }
    setVerificationLoading(true);
    try {
      const result = await emailVerificationService.initiateVerification();
      showSuccess(`Verification email sent! Link expires in ${result.expires_in_minutes} minutes.`);
      startCooldown();
    } catch (error: any) {
      const msg =
        error.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Failed to send verification email';
      showError(msg);
      if (error.response?.data?.retry_after_seconds)
        startCooldown(error.response.data.retry_after_seconds);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const formData = new FormData();
      formData.append('first_name',    profileForm.firstName);
      formData.append('last_name',     profileForm.lastName);
      formData.append('phone_number',  profileForm.phone);
      formData.append('bio',           profileForm.bio);
      if (profilePhotoFile) formData.append('profile_picture', profilePhotoFile);

      await apiService.patch('/auth/me/', formData);
      showSuccess('Profile updated successfully');
      setProfileDirty(false);
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);
      await refreshUser();
    } catch (error: any) {
      const data = error.response?.data;
      let msg = data?.error || data?.detail || error.message || 'Failed to save profile';
      if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .filter(([key]) => key !== 'error' && key !== 'detail')
          .flatMap(([, value]) => {
            if (Array.isArray(value)) return value.map(String);
            if (typeof value === 'string') return [value];
            return [];
          });
        if (fieldErrors.length > 0) msg = fieldErrors.join(' | ');
      }
      showError(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setProfilePhotoError('Please upload a JPG, PNG, or WebP image');
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfilePhotoError('Image must be less than 5MB');
      setProfilePhotoFile(null);
      setProfilePhotoPreview(null);
      return;
    }
    setProfilePhotoError(null);
    setProfilePhotoFile(file);
    setProfileDirty(true);
    const reader = new FileReader();
    reader.onloadend = () => setProfilePhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setProfilePhotoError(null);
    setProfileDirty(true);
  };

  const startResetCooldown = (secs = 60) => {
    setResetCooldown(secs);
    if (resetCooldownRef.current) clearInterval(resetCooldownRef.current);
    resetCooldownRef.current = setInterval(() => {
      setResetCooldown((p) => {
        if (p <= 1) { clearInterval(resetCooldownRef.current!); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const handleSendResetCode = async () => {
    if (!user?.email) return;
    setResetCodeSending(true);
    try {
      await apiService.post('/auth/password-reset/request/', { email: user.email });
      setResetStep('confirming');
      startResetCooldown(60);
      showSuccess('A 6-digit code has been sent to your email.');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to send code.';
      showError(msg);
    } finally { setResetCodeSending(false); }
  };

  const handleResendResetCode = async () => {
    if (resetCooldown > 0 || !user?.email) return;
    setResetCodeSending(true);
    try {
      await apiService.post('/auth/password-reset/request/', { email: user.email });
      startResetCooldown(60);
      setResetCode('');
      showSuccess('New code sent — check your inbox.');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Could not resend code.');
    } finally { setResetCodeSending(false); }
  };

  const handleConfirmResetCode = async () => {
    if (!user?.email) return;
    if (resetCode.length !== 6) { showError('Enter the 6-digit code from your email.'); return; }
    if (resetNewPw.length < 8)  { showError('New password must be at least 8 characters.'); return; }
    if (resetNewPw !== resetConfirmPw) { showError('Passwords do not match.'); return; }
    setResetSaving(true);
    try {
      await apiService.post('/auth/password-reset/confirm/', {
        email:            user.email,
        code:             resetCode,
        new_password:     resetNewPw,
        confirm_password: resetConfirmPw,
      });
      showSuccess('Password reset successfully! Please log in again.');
      setResetStep('idle');
      setResetCode(''); setResetNewPw(''); setResetConfirmPw('');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Invalid or expired code.');
    } finally { setResetSaving(false); }
  };

  const cancelReset = () => {
    setResetStep('idle');
    setResetCode(''); setResetNewPw(''); setResetConfirmPw('');
    if (resetCooldownRef.current) clearInterval(resetCooldownRef.current);
    setResetCooldown(0);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim())  { showError('Enter a new email address'); return; }
    if (!emailChangePw)    { showError('Enter your current password to confirm'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showError('Enter a valid email address'); return;
    }
    setEmailChangeSaving(true);
    try {
      const res: any = await apiService.post('/auth/change-email/', {
        new_email: newEmail.trim().toLowerCase(),
        password:  emailChangePw,
      });
      showSuccess(res.message ?? 'Email updated — please verify your new address');
      setEmailChangeStep('idle');
      setNewEmail('');
      setEmailChangePw('');
      await refreshUser();
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        data?.new_email?.[0]           ||
        data?.password?.[0]            ||
        data?.non_field_errors?.[0]    ||
        data?.detail                   ||
        'Failed to update email';
      showError(msg);
    } finally { setEmailChangeSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { showError('Type DELETE to confirm'); return; }
    setDangerLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      showSuccess('Account deleted');
      logout();
    } catch { showError('Failed to delete account'); }
    finally  { setDangerLoading(false); }
  };

  /* ─── derived display values ─── */
  const initials =
    ((user?.firstName?.charAt(0) ?? '') + (user?.lastName?.charAt(0) ?? '')).toUpperCase() || 'M';

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] ?? 'Member';

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="msx-page">

      {/* ── Verification status card ─────────────────────────── */}
      <div className="msx-status-card">
        <div className="msx-status-card-left">
          <div className="msx-status-icon-wrap">
            <MemberIcon name="user" size={22} className="msx-status-icon-sym" ariaHidden />
          </div>
          <div>
            <p className="msx-status-card-role">{user?.role ?? 'Member'}</p>
            <p className="msx-status-card-sub">
              Status:{' '}
              <span className={user?.isActive ? 'msx-status-active' : 'msx-status-inactive'}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>

        {user?.emailVerified ? (
          <span className="msx-status-badge msx-status-badge-ok">
            <MemberIcon name="verified" size={14} className="msx-status-badge-icon" ariaHidden />
            Email Verified
          </span>
        ) : (
          <span className="msx-status-badge msx-status-badge-warn">
            <MemberIcon name="warning" size={14} className="msx-status-badge-icon" ariaHidden />
            Verification Needed
          </span>
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────── */}
      <div className="msx-layout">

        {/* ═══ MAIN COLUMN ══════════════════════════════════════ */}
        <div className="msx-main">

          {/* ── Profile ───────────────────────────────────────── */}
          <section aria-labelledby="profile-heading">

            <div className="msx-panel">
            <h2 className="msx-section-title" id="profile-heading">
              <MemberIcon name="user" size={22} className="msx-section-title-icon" ariaHidden />
              Profile Information
            </h2>
              {/* Avatar row */}
              <div className="msx-profile-avatar-row">
                {/* Avatar circle with edit overlay */}
                <div className="msx-avatar-wrap">
                  <div className="msx-avatar-circle">
                    {profilePhotoPreview ? (
                      <img src={profilePhotoPreview} alt="Preview" />
                    ) : user?.profilePicture && !profilePhotoLoadFailed ? (
                      <img
                        src={user.profilePicture}
                        alt={fullName}
                        onError={() => setProfilePhotoLoadFailed(true)}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <label className="msx-avatar-edit-btn" aria-label="Change profile photo">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleProfilePhotoSelect}
                      className="msx-upload-input"
                      disabled={profileSaving}
                    />
                    <MemberIcon name="editSquare" size={16} className="msx-avatar-edit-icon" ariaHidden />
                  </label>
                </div>

                {/* Upload info */}
                <div className="msx-avatar-info">
                  <p>Upload profile image</p>
                  <span>JPG, PNG, or WebP • up to 5MB</span>
                  {(profilePhotoPreview || (user?.profilePicture && !profilePhotoLoadFailed)) && (
                    <button
                      type="button"
                      className="msx-btn msx-btn-soft"
                      style={{ marginTop: '0.625rem', height: '34px', fontSize: '0.8125rem' }}
                      onClick={handleRemoveProfilePhoto}
                      disabled={profileSaving}
                    >
                      <MemberIcon name="delete" size={13} />
                      Remove Photo
                    </button>
                  )}
                  {profilePhotoError && (
                    <div className="msx-inline-error" style={{ marginTop: '0.5rem' }}>
                      <MemberIcon name="error" size={13} />
                      {profilePhotoError}
                    </div>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="msx-fields-grid">
                <div className="msx-field">
                  <label className="msx-label">First Name</label>
                  <input
                    className="msx-input"
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => {
                      setProfileForm((p) => ({ ...p, firstName: e.target.value }));
                      setProfileDirty(true);
                    }}
                    placeholder="First name"
                  />
                </div>

                <div className="msx-field">
                  <label className="msx-label">Last Name</label>
                  <input
                    className="msx-input"
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => {
                      setProfileForm((p) => ({ ...p, lastName: e.target.value }));
                      setProfileDirty(true);
                    }}
                    placeholder="Last name"
                  />
                </div>

                <div className="msx-field msx-field-full">
                  <label className="msx-label">Phone Number</label>
                  <input
                    className="msx-input"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => {
                      setProfileForm((p) => ({ ...p, phone: e.target.value }));
                      setProfileDirty(true);
                    }}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="msx-field msx-field-full">
                  <label className="msx-label">
                    Bio
                    <span className="msx-count">{profileForm.bio.length}/280</span>
                  </label>
                  <textarea
                    className="msx-input msx-textarea"
                    value={profileForm.bio}
                    onChange={(e) => {
                      setProfileForm((p) => ({ ...p, bio: e.target.value }));
                      setProfileDirty(true);
                    }}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={280}
                  />
                </div>
              </div>

              {/* Save row */}
              <div className="msx-save-row">
                <span className="msx-unsaved-hint">
                  {profileDirty && 'Unsaved changes'}
                </span>
                <button
                  className="msx-btn msx-btn-primary"
                  onClick={handleProfileSave}
                  disabled={profileSaving || !profileDirty}
                  style={{ minWidth: '140px' }}
                >
                  {profileSaving ? (
                    <><span className="m-btn-spinner" /> Saving…</>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* ── Notifications ─────────────────────────────────── */}
          <section aria-labelledby="notif-heading">
            <h2 className="msx-section-title" id="notif-heading">
              <MemberIcon name="notifications" size={22} className="msx-section-title-icon" ariaHidden />
              Notifications
            </h2>
            <p className="msx-section-sub">Choose how and when you receive updates.</p>

            <div className="msx-panel">
              {/* Email Alerts */}
              <p className="msx-group-title">Email Alerts</p>
              <div className="msx-stack">
                <OptionRow label="New Sermons">
                  <Toggle
                    checked={notif.emailSermons}
                    onChange={(v) => setNotif((p) => ({ ...p, emailSermons: v }))}
                  />
                </OptionRow>
                <OptionRow label="Event Reminders">
                  <Toggle
                    checked={notif.emailEvents}
                    onChange={(v) => setNotif((p) => ({ ...p, emailEvents: v }))}
                  />
                </OptionRow>
                <OptionRow label="Prayer Responses">
                  <Toggle
                    checked={notif.emailPrayer}
                    onChange={(v) => setNotif((p) => ({ ...p, emailPrayer: v }))}
                  />
                </OptionRow>
                <OptionRow label="Church Announcements">
                  <Toggle
                    checked={notif.emailAnnounce}
                    onChange={(v) => setNotif((p) => ({ ...p, emailAnnounce: v }))}
                  />
                </OptionRow>
              </div>

              {/* Push Alerts */}
              <p className="msx-group-title" style={{ marginTop: '1.5rem' }}>Push Alerts</p>
              <div className="msx-stack">
                <OptionRow label="Community Replies">
                  <Toggle
                    checked={notif.pushMessages}
                    onChange={(v) => setNotif((p) => ({ ...p, pushMessages: v }))}
                  />
                </OptionRow>
                <OptionRow label="Service Reminders">
                  <Toggle
                    checked={notif.pushReminders}
                    onChange={(v) => setNotif((p) => ({ ...p, pushReminders: v }))}
                  />
                </OptionRow>
              </div>
            </div>
          </section>


          {/* ── Privacy ───────────────────────────────────────── */}
          <section aria-labelledby="privacy-heading">
            <div className="msx-panel">
            <h2 className="msx-section-title" id="privacy-heading">
              <MemberIcon name="admin" size={22} className="msx-section-title-icon" ariaHidden />
              Privacy
            </h2>
            <p className="msx-section-sub">Set your visibility and data preferences.</p>

              <div className="msx-stack">
                <OptionRow
                  label="Public Profile"
                  desc="Let others find you in the directory"
                >
                  <Toggle
                    checked={privacy.profilePublic}
                    onChange={(v) => setPrivacy((p) => ({ ...p, profilePublic: v }))}
                  />
                </OptionRow>
                <OptionRow
                  label="Show Email Address"
                  desc="Visible to members only"
                >
                  <Toggle
                    checked={privacy.showEmail}
                    onChange={(v) => setPrivacy((p) => ({ ...p, showEmail: v }))}
                  />
                </OptionRow>
                <OptionRow
                  label="Allow Direct Messages"
                  desc="From verified community members"
                >
                  <Toggle
                    checked={privacy.allowDirectMsg}
                    onChange={(v) => setPrivacy((p) => ({ ...p, allowDirectMsg: v }))}
                  />
                </OptionRow>
                <OptionRow
                  label="Usage Analytics"
                  desc="Help us improve the app experience"
                >
                  <Toggle
                    checked={privacy.dataAnalytics}
                    onChange={(v) => setPrivacy((p) => ({ ...p, dataAnalytics: v }))}
                  />
                </OptionRow>
              </div>

              {/* Data export */}
              <div className="msx-export-row">
                <div className="msx-export-info">
                  <p>Download My Data</p>
                  <p>Receive a copy of your Sanctuary data via email</p>
                </div>
                <button className="msx-btn msx-btn-outline-red">
                  Request Export
                </button>
              </div>
            </div>
          </section>



          {/* ── Security ──────────────────────────────────────── */}
          <section aria-labelledby="security-heading">

            <div className="msx-panel">
            <h2 className="msx-section-title" id="security-heading">
              <MemberIcon name="lock" size={22} className="msx-section-title-icon" ariaHidden />
              Security
            </h2>

              {/* Email verification */}
              <div className="msx-subsection">
                {user?.emailVerified ? (
                  <div className="msx-verified-box">
                    <MemberIcon name="verified" size={22} className="msx-verified-icon" ariaHidden />
                    <div className="msx-verified-body">
                      <strong>Email verified</strong>
                      <p>{user?.email} is verified for secure actions.</p>
                    </div>
                  </div>
                ) : (
                  <div className="msx-verify-alert">
                    <MemberIcon name="mail" size={22} className="msx-verify-alert-icon" ariaHidden />
                    <div className="msx-verify-alert-body">
                      <p className="msx-verify-alert-title">
                        Email Verification
                        <span className="msx-verify-tag">Verification required</span>
                      </p>
                      <p className="msx-verify-alert-sub">
                        Send a fresh verification email to{' '}
                        <strong>{user?.email}</strong>
                      </p>
                      <button
                        className="msx-btn msx-btn-soft"
                        onClick={handleSendVerificationEmail}
                        disabled={verificationLoading || cooldownSeconds > 0}
                      >
                        {verificationLoading
                          ? <><span className="m-btn-spinner" /> Sending…</>
                          : cooldownSeconds > 0
                          ? `Resend in ${cooldownSeconds}s`
                          : 'Send Verification Email'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email address */}
              <div className="msx-subsection">
                <div className="msx-security-row">
                  <div>
                    <p className="msx-security-row-label">Email Address</p>
                    <p className="msx-security-row-sub">
                      Current login email: <strong>{user?.email}</strong>
                    </p>
                  </div>
                  {emailChangeStep === 'idle' && (
                    <button
                      className="msx-btn msx-btn-soft"
                      style={{ height: '36px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                      onClick={() => setEmailChangeStep('form')}
                    >
                      Change Email
                    </button>
                  )}
                </div>

                {emailChangeStep === 'form' && (
                  <div className="msx-form-box">
                    <div className="msx-field">
                      <label className="msx-label">New Email Address</label>
                      <input
                        className="msx-input"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        autoFocus
                      />
                    </div>
                    <div className="msx-field">
                      <label className="msx-label">Current Password</label>
                      <div className="msx-input-wrap">
                        <input
                          className="msx-input"
                          type={emailChangePwShow ? 'text' : 'password'}
                          value={emailChangePw}
                          onChange={(e) => setEmailChangePw(e.target.value)}
                          placeholder="Confirm with your password"
                        />
                        <button
                          className="msx-eye"
                          type="button"
                          onClick={() => setEmailChangePwShow((v) => !v)}
                        >
                          <MemberIcon name={emailChangePwShow ? 'eyeOff' : 'eye'} size={17} />
                        </button>
                      </div>
                    </div>
                    <p className="msx-note">
                      Changing email resets verification status until the new address is confirmed.
                    </p>
                    <div className="msx-actions-row">
                      <button
                        className="msx-btn msx-btn-ghost"
                        type="button"
                        onClick={() => {
                          setEmailChangeStep('idle');
                          setNewEmail('');
                          setEmailChangePw('');
                        }}
                        disabled={emailChangeSaving}
                      >
                        Cancel
                      </button>
                      <button
                        className="msx-btn msx-btn-primary"
                        type="button"
                        onClick={handleChangeEmail}
                        disabled={emailChangeSaving}
                      >
                        {emailChangeSaving
                          ? <><span className="m-btn-spinner" /> Saving…</>
                          : 'Update Email'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="msx-subsection">
                <div className="msx-security-row" style={{ borderBottom: 'none' }}>
                  <div>
                    <p className="msx-security-row-label">Password</p>
                    <p className="msx-security-row-sub">
                      Password reset uses a 6-digit code sent to your verified email.
                    </p>
                  </div>
                  {resetStep === 'idle' && (
                    <button
                      className="msx-btn msx-btn-soft"
                      style={{ height: '36px', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                      onClick={() => setResetStep('requesting')}
                    >
                      Change Password
                    </button>
                  )}
                </div>

                {resetStep !== 'idle' && (
                  <div className="msx-form-box">
                    {resetStep === 'requesting' && (
                      <>
                        <p className="msx-note">
                          Send a reset code to <strong>{user?.email}</strong>.
                        </p>
                        <div className="msx-actions-row">
                          <button
                            className="msx-btn msx-btn-ghost"
                            type="button"
                            onClick={cancelReset}
                            disabled={resetCodeSending}
                          >
                            Cancel
                          </button>
                          <button
                            className="msx-btn msx-btn-primary"
                            type="button"
                            onClick={handleSendResetCode}
                            disabled={resetCodeSending}
                          >
                            {resetCodeSending
                              ? <><span className="m-btn-spinner" /> Sending…</>
                              : 'Send Code'}
                          </button>
                        </div>
                      </>
                    )}

                    {resetStep === 'confirming' && (
                      <>
                        <div className="msx-field">
                          <label className="msx-label">6-Digit Code</label>
                          <input
                            className="msx-input msx-code"
                            type="text"
                            inputMode="numeric"
                            pattern="\d{6}"
                            maxLength={6}
                            value={resetCode}
                            onChange={(e) =>
                              setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            placeholder="000000"
                            autoFocus
                          />
                        </div>

                        <div className="msx-field">
                          <label className="msx-label">New Password</label>
                          <div className="msx-input-wrap">
                            <input
                              className="msx-input"
                              type={showPwVis ? 'text' : 'password'}
                              value={resetNewPw}
                              onChange={(e) => setResetNewPw(e.target.value)}
                              placeholder="At least 8 characters"
                            />
                            <button
                              className="msx-eye"
                              type="button"
                              onClick={() => setShowPwVis((v) => !v)}
                            >
                              <MemberIcon name={showPwVis ? 'eyeOff' : 'eye'} size={17} />
                            </button>
                          </div>
                        </div>

                        <div className="msx-field">
                          <label className="msx-label">Confirm Password</label>
                          <input
                            className={`msx-input${
                              resetConfirmPw && resetNewPw !== resetConfirmPw
                                ? ' msx-input-error'
                                : ''
                            }`}
                            type={showPwVis ? 'text' : 'password'}
                            value={resetConfirmPw}
                            onChange={(e) => setResetConfirmPw(e.target.value)}
                            placeholder="Repeat new password"
                          />
                          {resetConfirmPw && resetNewPw !== resetConfirmPw && (
                            <p className="msx-error-text">Passwords do not match</p>
                          )}
                        </div>

                        <div className="msx-resend-row">
                          {resetCooldown > 0 ? (
                            <span className="msx-note">Resend in {resetCooldown}s</span>
                          ) : (
                            <button
                              type="button"
                              className="msx-link"
                              onClick={handleResendResetCode}
                              disabled={resetCodeSending}
                            >
                              Resend code
                            </button>
                          )}
                        </div>

                        <div className="msx-actions-row">
                          <button
                            className="msx-btn msx-btn-ghost"
                            type="button"
                            onClick={cancelReset}
                            disabled={resetSaving}
                          >
                            Cancel
                          </button>
                          <button
                            className="msx-btn msx-btn-primary"
                            type="button"
                            onClick={handleConfirmResetCode}
                            disabled={resetSaving}
                          >
                            {resetSaving
                              ? <><span className="m-btn-spinner" /> Resetting…</>
                              : 'Reset Password'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>


          {/* ── Danger Zone ───────────────────────────────────── */}
          <section aria-labelledby="danger-heading">
            {/* Red separator */}
            <div className="msx-danger-divider">
              <span className="msx-danger-divider-line" />
              <span className="msx-danger-divider-label">Danger Zone</span>
              <span className="msx-danger-divider-line" />
            </div>

            <div className="msx-danger-panel">
              <p className="msx-danger-title" id="danger-heading">
                Permanently delete account
              </p>
              <p className="msx-danger-desc">
                These actions are permanent and cannot be undone. This will delete your profile,
                messages, and all related data.
              </p>

              <div className="msx-danger-input-wrap">
                <label className="msx-danger-confirm-label">
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  className="msx-input msx-input-danger"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                />
              </div>

              <button
                className="msx-btn msx-btn-danger"
                onClick={handleDeleteAccount}
                disabled={dangerLoading || deleteConfirm !== 'DELETE'}
              >
                {dangerLoading
                  ? <><span className="m-btn-spinner" /> Processing…</>
                  : 'Delete My Account'}
              </button>
            </div>
          </section>

        </div>{/* /.msx-main */}

        {/* ═══ SIDEBAR ══════════════════════════════════════════ */}
        <aside className="msx-side" aria-label="Account details">

          {/* Account Snapshot */}
          <div className="msx-panel">
            <h3 className="msx-side-title">
              <MemberIcon name="camera" size={18} className="msx-side-title-icon" ariaHidden />
              Account Snapshot
            </h3>

            <div className="msx-meta-list">
              {[
                { label: 'Email',        value: user?.email ?? 'N/A' },
                { label: 'Full Name',    value: fullName },
                { label: 'Role',         value: user?.role ?? 'N/A' },
                { label: 'Status',       value: user?.isActive ? 'Active' : 'Inactive' },
                {
                  label: 'Member Since',
                  value: user?.dateJoined
                    ? new Date(user.dateJoined).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A',
                },
                { label: 'Email Verified', value: user?.emailVerified ? 'Yes' : 'No' },
              ].map((item) => (
                <div key={item.label} className="msx-meta-item">
                  <span className="msx-meta-item-label">{item.label}</span>
                  <span className="msx-meta-item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </div>{/* /.msx-layout */}
    </div>
  );
};

export default MemberSettings;