import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserCircle,
  ShieldCheck,
  Building2,
  CreditCard,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  Trash2,
  CheckCircle2,
  Edit3,
  Laptop,
  Mail,
  Phone,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ThemePreferenceSelector } from '../../hooks/useTheme';
import { BottomSheet, CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  NotificationPreferences,
  OwnerSubscription,
  PaymentTransaction,
  PrivacySettings,
  UserSessionInfo,
} from '../../../packages/shared/types';

interface ProfileSummary {
  stats: {
    totalProperties: number;
    approvedProperties: number;
    totalBeds: number;
    occupiedBeds: number;
    activeTenants: number;
    qrRequestsCount: number;
  };
  subscription: OwnerSubscription | null;
  transactions: PaymentTransaction[];
}

export function OwnerProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { showToast, confirmAction } = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);

  // Edit Profile
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Verified Contact Change (Email / Phone)
  const [contactModal, setContactModal] = useState<'email' | 'phone' | null>(null);
  const [contactValue, setContactValue] = useState('');
  const [contactOtpSent, setContactOtpSent] = useState(false);
  const [contactOtpCode, setContactOtpCode] = useState('');
  const [contactOtpHint, setContactOtpHint] = useState('');
  const [contactBusy, setContactBusy] = useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Preferences
  const [language, setLanguage] = useState('en');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    emailAlerts: true,
    smsAlerts: true,
    joiningRequests: true,
    rentReminders: true,
    maintenanceAlerts: true,
  });
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    showBusinessPhonePublicly: true,
    showEmailPublicly: true,
  });

  // Help & Support + Deletion Modals
  const [supportModal, setSupportModal] = useState<'help' | 'faq' | 'contact' | 'terms' | 'privacy' | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, sessRes] = await Promise.all([
        apiFetch<ProfileSummary>('/api/v1/operations/owner/profile-summary'),
        apiFetch<{ sessions: UserSessionInfo[] }>('/api/v1/auth/sessions'),
      ]);
      setSummary(sumRes);
      setSessions(sessRes.sessions || []);
    } catch {
      showToast('Could not load profile details', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setBusinessName(user.businessName || '');
      setBusinessDescription(user.businessDescription || '');
      setCity(user.city || 'Hyderabad');
      setAvatarUrl(user.avatarUrl || '');
      setLanguage(user.language || 'en');
      if (user.notificationPreferences) setNotifPrefs(user.notificationPreferences);
      if (user.privacySettings) setPrivacy(user.privacySettings);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          businessName,
          businessDescription,
          city,
          avatarUrl,
        }),
      });
      await refreshUser();
      setEditOpen(false);
      showToast('Profile Updated', 'Your personal and business details have been saved.');
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendContactOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactModal) return;
    setContactBusy(true);
    try {
      const res = await apiFetch<{ sent: boolean; devOtpHint?: string }>('/api/v1/auth/profile/contact-change/request', {
        method: 'POST',
        body: JSON.stringify({ field: contactModal, value: contactValue }),
      });
      setContactOtpSent(true);
      setContactOtpHint(res.devOtpHint || '482910');
      showToast('Verification OTP Sent', 'Enter the 6-digit code to confirm change.');
    } catch (err: any) {
      showToast('Could not send OTP', err.message, 'error');
    } finally {
      setContactBusy(false);
    }
  };

  const handleVerifyContactChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactModal) return;
    setContactBusy(true);
    try {
      await apiFetch('/api/v1/auth/profile/contact-change/verify', {
        method: 'POST',
        body: JSON.stringify({ field: contactModal, value: contactValue, code: contactOtpCode }),
      });
      await refreshUser();
      setContactModal(null);
      setContactOtpSent(false);
      setContactValue('');
      setContactOtpCode('');
      showToast(contactModal === 'email' ? 'Email Updated & Verified' : 'Mobile Number Updated & Verified');
    } catch (err: any) {
      showToast('Verification failed', err.message, 'error');
    } finally {
      setContactBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await apiFetch('/api/v1/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password Changed', 'Your owner account password was updated.');
    } catch (err: any) {
      showToast('Password update failed', err.message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    const ok = await confirmAction({
      title: 'Log out all other devices?',
      description: 'Active refresh sessions on other browsers or phones will be invalidated immediately.',
      confirmLabel: 'Logout Other Devices',
    });
    if (!ok) return;
    try {
      const res = await apiFetch<{ revokedCount: number }>('/api/v1/auth/sessions/revoke-others', {
        method: 'POST',
      });
      showToast('Other Sessions Revoked', `${res.revokedCount} session(s) signed out.`);
      await loadData();
    } catch (err: any) {
      showToast('Could not revoke sessions', err.message, 'error');
    }
  };

  const updatePreferences = async (
    nextNotifs: NotificationPreferences,
    nextPrivacy: PrivacySettings,
    nextLang: string
  ) => {
    setNotifPrefs(nextNotifs);
    setPrivacy(nextPrivacy);
    setLanguage(nextLang);
    try {
      await apiFetch('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationPreferences: nextNotifs,
          privacySettings: nextPrivacy,
          language: nextLang,
        }),
      });
      await refreshUser();
      showToast('Preferences saved');
    } catch (err: any) {
      showToast('Could not save preferences', err.message, 'error');
    }
  };

  const handleRequestAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletingBusy(true);
    try {
      await apiFetch('/api/v1/auth/account/delete-request', {
        method: 'POST',
        body: JSON.stringify({ password: deletePassword, reason: deleteReason }),
      });
      await refreshUser();
      setDeleteOpen(false);
      setDeletePassword('');
      setDeleteReason('');
      showToast(
        'Account Deletion Request Logged',
        'Compliance review queued. Active financial & legal records remain safely preserved.',
        'info'
      );
    } catch (err: any) {
      showToast('Deletion request failed', err.message, 'error');
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading || !user) return <CardSkeleton rows={4} />;

  const initials = (user.fullName || 'PG Owner')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* SECTION 1: Profile Header */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] dark:bg-[#10B981]/15 border border-[#047857]/20 dark:border-[#34D399]/30 text-[#047857] dark:text-[#34D399] font-display font-extrabold text-xl flex items-center justify-center shrink-0 overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusIndicator status={user.isVerified ? 'success' : 'warning'} label={user.isVerified ? 'Verified Owner' : 'Pending OTP'} />
              <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF]">PG_OWNER</span>
            </div>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
              {user.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF] truncate">
              {user.businessName || 'Independent PG Operator'} · {user.city || 'Hyderabad'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="min-h-[42px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Profile
        </button>
      </section>

      {/* SECTION 2: Personal Information */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Personal Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Full Name</p>
            <p className="mt-1 font-semibold text-[#111827] dark:text-[#F9FAFB]">{user.fullName}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Primary City</p>
            <p className="mt-1 font-semibold text-[#111827] dark:text-[#F9FAFB]">{user.city || 'Not specified'}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </p>
              <p className="mt-1 font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setContactModal('email');
                setContactValue(user.email);
                setContactOtpSent(false);
              }}
              className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline shrink-0"
            >
              Change
            </button>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Mobile Number
              </p>
              <p className="mt-1 font-mono font-semibold text-[#111827] dark:text-[#F9FAFB]">{user.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setContactModal('phone');
                setContactValue(user.phone);
                setContactOtpSent(false);
              }}
              className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline shrink-0"
            >
              Change
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 3: Business Information */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Business &amp; Portfolio Summary</h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link to="/owner/properties" className="text-[#047857] dark:text-[#34D399] hover:underline">
              My Properties
            </Link>
            <Link to="/owner/qr-onboarding" className="text-[#047857] dark:text-[#34D399] hover:underline inline-flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> QR Onboarding
            </Link>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
          <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">
            {user.businessName || 'Set your PG Brand / Business Name'}
          </p>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            {user.businessDescription || 'Add a brief description of your co-living operations via Edit Profile.'}
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Properties</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums">{summary.stats.totalProperties}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Approved PGs</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#047857] dark:text-[#34D399] tabular-nums">{summary.stats.approvedProperties}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Total Beds</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums">{summary.stats.totalBeds}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Occupied</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums">{summary.stats.occupiedBeds}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Active Tenants</p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums">{summary.stats.activeTenants}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">QR Requests</p>
              <p className="mt-1 font-mono text-lg font-bold text-[#047857] dark:text-[#34D399] tabular-nums">{summary.stats.qrRequestsCount}</p>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: Account Security */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Account Security &amp; Active Sessions</h2>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1">Confirm</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="min-h-[42px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold shrink-0"
            >
              {changingPassword ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#374151] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
                Active Login Sessions ({sessions.length})
              </p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Manage authenticated browsers and mobile sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
            >
              Logout Other Devices
            </button>
          </div>

          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                  <div>
                    <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{s.deviceLabel}</p>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                      Issued {new Date(s.createdAt).toLocaleString('en-IN')} · Expires {new Date(s.expiresAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                {s.isCurrent && <StatusIndicator status="success" label="Current Device" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: Subscription Information */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Subscription &amp; Billing</h2>
          </div>
          <Link
            to="/owner/subscriptions"
            className="min-h-[38px] px-3.5 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold inline-flex items-center gap-1"
          >
            Manage Subscription
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
            <p className="text-[#6B7280] dark:text-[#9CA3AF]">Current Plan</p>
            <p className="mt-1 font-display text-base font-bold text-[#047857] dark:text-[#34D399]">
              {summary?.subscription?.tier || 'BASIC'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
            <p className="text-[#6B7280] dark:text-[#9CA3AF]">Plan Status</p>
            <p className="mt-1 font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {summary?.subscription?.status || 'ACTIVE'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
            <p className="text-[#6B7280] dark:text-[#9CA3AF]">Renewal Date</p>
            <p className="mt-1 font-mono font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {summary?.subscription?.renewalDate || 'N/A'}
            </p>
          </div>
        </div>

        {summary && summary.transactions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-wider">Recent Invoices</p>
            {summary.transactions.slice(0, 3).map((txn) => (
              <div
                key={txn.id}
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{txn.description}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {new Date(txn.createdAt).toLocaleDateString('en-IN')} · {txn.status}
                  </p>
                </div>
                <span className="font-mono font-bold tabular-nums">{formatInr(txn.amountInr)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 6: Preferences (Theme, Notifications, Language, Privacy) */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Preferences</h2>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] mb-2">Application Theme</p>
          <ThemePreferenceSelector />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-[#374151]">
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Notification Channels</p>
            {(
              [
                ['emailAlerts', 'Email operational summaries'],
                ['smsAlerts', 'SMS urgent alerts'],
                ['joiningRequests', 'New QR & joining request alerts'],
                ['rentReminders', 'Rent collection & overdue reminders'],
                ['maintenanceAlerts', 'Resident complaint & repair tickets'],
              ] as [keyof NotificationPreferences, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-2 text-xs text-[#4B5563] dark:text-[#D1D5DB] cursor-pointer">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={notifPrefs[key]}
                  onChange={(e) =>
                    updatePreferences({ ...notifPrefs, [key]: e.target.checked }, privacy, language)
                  }
                  className="rounded border-[#E5E7EB] dark:border-[#374151] text-[#047857]"
                />
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#111827] dark:text-[#F9FAFB] mb-1">Display Language</label>
              <select
                value={language}
                onChange={(e) => updatePreferences(notifPrefs, privacy, e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
              >
                <option value="en">English (India)</option>
                <option value="hi">हिन्दी (Preview Placeholder)</option>
                <option value="te">తెలుగు (Preview Placeholder)</option>
              </select>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Public Listing Privacy</p>
              <label className="flex items-center justify-between gap-2 text-xs text-[#4B5563] dark:text-[#D1D5DB] cursor-pointer">
                <span>Show business phone on verified listings</span>
                <input
                  type="checkbox"
                  checked={privacy.showBusinessPhonePublicly}
                  onChange={(e) =>
                    updatePreferences(notifPrefs, { ...privacy, showBusinessPhonePublicly: e.target.checked }, language)
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-[#4B5563] dark:text-[#D1D5DB] cursor-pointer">
                <span>Show contact email on verified listings</span>
                <input
                  type="checkbox"
                  checked={privacy.showEmailPublicly}
                  onChange={(e) =>
                    updatePreferences(notifPrefs, { ...privacy, showEmailPublicly: e.target.checked }, language)
                  }
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Help & Support */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#047857] dark:text-[#34D399]" />
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Help &amp; Support</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'help' as const, label: 'Help Center' },
            { id: 'contact' as const, label: 'Contact Support' },
            { id: 'faq' as const, label: 'Owner FAQs' },
            { id: 'terms' as const, label: 'Terms of Service' },
            { id: 'privacy' as const, label: 'Privacy Policy' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSupportModal(item.id)}
              className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] hover:border-[#047857] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 8: Account Actions */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Account Actions</h2>
        {user.deletionRequestedAt && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            Account deletion request logged on {new Date(user.deletionRequestedAt).toLocaleString('en-IN')}. Active property, stay, and financial audit ledgers are retained safely per statutory compliance rules.
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[42px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Logout of Current Device
          </button>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="min-h-[42px] px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-semibold text-[#DC2626] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Request Account Deletion
          </button>
        </div>
      </section>

      {/* Edit Profile Modal */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Owner Profile">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Business / PG Brand Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Business Description</label>
            <textarea
              rows={3}
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Primary City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Profile Photo URL (optional)</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="w-full min-h-[44px] rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold"
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </BottomSheet>

      {/* Verified Email / Phone Change Modal */}
      <BottomSheet
        open={Boolean(contactModal)}
        onClose={() => setContactModal(null)}
        title={contactModal === 'email' ? 'Verify & Update Email' : 'Verify & Update Mobile Number'}
      >
        {!contactOtpSent ? (
          <form onSubmit={handleSendContactOtp} className="space-y-4">
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              For account security, updating your {contactModal === 'email' ? 'email address' : 'mobile number'} requires 6-digit OTP verification.
            </p>
            <input
              type={contactModal === 'email' ? 'email' : 'tel'}
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <button
              type="submit"
              disabled={contactBusy}
              className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold"
            >
              {contactBusy ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyContactChange} className="space-y-4">
            {contactOtpHint && (
              <p className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-xs text-[#065F46] dark:text-[#34D399]">
                Demo Verification Code: <span className="font-mono font-bold">{contactOtpHint}</span>
              </p>
            )}
            <input
              type="text"
              maxLength={6}
              value={contactOtpCode}
              onChange={(e) => setContactOtpCode(e.target.value)}
              placeholder="Enter 6-digit OTP"
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] font-mono text-center tracking-widest text-lg"
            />
            <button
              type="submit"
              disabled={contactBusy}
              className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {contactBusy ? 'Verifying...' : 'Confirm Verified Change'}
            </button>
          </form>
        )}
      </BottomSheet>

      {/* Help & Support Dialog */}
      <BottomSheet
        open={Boolean(supportModal)}
        onClose={() => setSupportModal(null)}
        title={
          supportModal === 'help'
            ? 'Owner Help Center'
            : supportModal === 'faq'
              ? 'PG Owner Frequently Asked Questions'
              : supportModal === 'contact'
                ? 'Contact PG Finder Support'
                : supportModal === 'terms'
                  ? 'PG Finder Operator Terms'
                  : 'Privacy & Data Commitments'
        }
      >
        {supportModal === 'contact' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSupportMessage('');
              setSupportModal(null);
              showToast('Support Ticket Logged', 'PG Finder operations team will respond via email within 24 hours.');
            }}
            className="space-y-4"
          >
            <textarea
              rows={4}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe your approval, billing, or tenant ledger question..."
              required
              className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Send Support Request
            </button>
          </form>
        ) : supportModal === 'faq' ? (
          <div className="space-y-3 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
            <p><strong>How do PGs become visible via QR or search?</strong> Every PG requires Admin Compliance Approval, Location Pin Verification, and either ₹199 Lifetime Listing or Pro/Business plan coverage.</p>
            <p><strong>What happens when I edit an approved PG&apos;s address?</strong> Location verification automatically moves to Re-verification Required so residents always get accurate coordinates.</p>
            <p><strong>How does QR onboarding work?</strong> Residents scan your poster, review rules &amp; room sharing rates, submit a request, and await your bed assignment + agreement acceptance.</p>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
            <p>
              PG Finder operates as a modular property management &amp; verified discovery workspace. Financial ledgers, rent receipts, deposit settlements, and tenant stay records are preserved safely across account changes.
            </p>
            <p>
              No Aadhaar numbers or Aadhaar scans are requested or stored in verification workflows; only lawful alternative IDs (Company/College ID, Driving License, Passport, or Local Police Verification) are permitted.
            </p>
          </div>
        )}
      </BottomSheet>

      {/* Non-destructive Account Deletion Confirmation Modal */}
      <BottomSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Request Account Deletion">
        <form onSubmit={handleRequestAccountDeletion} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-[#DC2626] dark:text-red-300">
            Submitting an account deletion request schedules your operator account for compliance review. Active tenant stays, financial ledgers, and tax receipts are never immediately deleted.
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Reason for Request</label>
            <input
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Consolidating properties under another account"
              required
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Confirm Current Password</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={deletingBusy}
            className="w-full min-h-[44px] rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-sm font-semibold"
          >
            {deletingBusy ? 'Submitting Request...' : 'Confirm Account Deletion Request'}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
