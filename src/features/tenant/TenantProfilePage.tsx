import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  FileCheck2,
  Heart,
  HelpCircle,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  Palette,
  Receipt,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import {
  NotificationItem,
  NotificationPreferences,
  PlatformCmsContent,
  SupportTicket,
  TenantStay,
  UserSessionInfo,
} from '../../../packages/shared/types';
import { INDIAN_CITIES } from '../../../packages/shared/constants';
import { BottomSheet, StatusIndicator } from '../../components/ui/CommonUI';
import { ThemePreferenceSelector } from '../../hooks/useTheme';

const DEFAULT_NOTIFS: NotificationPreferences = {
  emailAlerts: true,
  smsAlerts: true,
  joiningRequests: true,
  rentReminders: true,
  maintenanceAlerts: true,
};

export function TenantProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast, confirmAction } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pastStays, setPastStays] = useState<TenantStay[]>([]);
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [cms, setCms] = useState<PlatformCmsContent | null>(null);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [city, setCity] = useState(user?.city || 'Hyderabad');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [occupationStatus, setOccupationStatus] = useState(user?.occupationStatus || 'WORKING_PROFESSIONAL');
  const [emergencyContactName, setEmergencyContactName] = useState(user?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.emergencyContactPhone || '');
  const [consentPersonalizedAds, setConsentPersonalizedAds] = useState(Boolean(user?.consentPersonalizedAds));
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(user?.notificationPreferences || DEFAULT_NOTIFS);
  const [savingProfile, setSavingProfile] = useState(false);

  // Contact OTP change
  const [changeField, setChangeField] = useState<'email' | 'phone'>('phone');
  const [changeValue, setChangeValue] = useState('');
  const [changeOtp, setChangeOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  // Support ticket form
  const [tktSubject, setTktSubject] = useState('');
  const [tktCategory, setTktCategory] = useState<'DISPUTE' | 'PAYMENT' | 'ACCOUNT' | 'LISTING' | 'SAFETY' | 'OTHER'>('ACCOUNT');
  const [tktMessage, setTktMessage] = useState('');

  const loadAll = async () => {
    try {
      const [n, w, sess, tkt, pubCms] = await Promise.all([
        apiFetch<{ notifications: NotificationItem[] }>('/api/v1/admin/notifications'),
        apiFetch<{ pastStays: TenantStay[] }>('/api/v1/operations/tenant/workspace'),
        apiFetch<{ sessions: UserSessionInfo[] }>('/api/v1/auth/sessions'),
        apiFetch<{ tickets: SupportTicket[] }>('/api/v1/operations/support-tickets'),
        apiFetch<{ cms: PlatformCmsContent }>('/api/v1/admin/cms/public'),
      ]);
      setNotifications(n.notifications || []);
      setPastStays(w.pastStays || []);
      setSessions(sess.sessions || []);
      setTickets(tkt.tickets || []);
      setCms(pubCms.cms || null);
    } catch {
      // Partial load graceful handling
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setCity(user.city || 'Hyderabad');
      setAvatarUrl(user.avatarUrl || '');
      setOccupationStatus(user.occupationStatus || 'WORKING_PROFESSIONAL');
      setEmergencyContactName(user.emergencyContactName || '');
      setEmergencyContactPhone(user.emergencyContactPhone || '');
      setConsentPersonalizedAds(Boolean(user.consentPersonalizedAds));
      setNotifPrefs(user.notificationPreferences || DEFAULT_NOTIFS);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          city,
          avatarUrl,
          occupationStatus,
          emergencyContactName,
          emergencyContactPhone,
          consentPersonalizedAds,
          notificationPreferences: notifPrefs,
        }),
      });
      await refreshUser();
      showToast('Profile & Preferences Saved');
    } catch (err: any) {
      showToast('Could not save profile', err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestContactChange = async () => {
    try {
      const res = await apiFetch<{ devOtpHint?: string }>('/api/v1/auth/profile/contact-change/request', {
        method: 'POST',
        body: JSON.stringify({ field: changeField, value: changeValue }),
      });
      setOtpRequested(true);
      showToast('OTP Sent', `Verification code sent to ${changeValue} (Demo code: ${res.devOtpHint || '482910'})`);
    } catch (err: any) {
      showToast('Request failed', err.message, 'error');
    }
  };

  const handleVerifyContactChange = async () => {
    try {
      await apiFetch('/api/v1/auth/profile/contact-change/verify', {
        method: 'POST',
        body: JSON.stringify({ field: changeField, value: changeValue, code: changeOtp }),
      });
      setOtpRequested(false);
      setChangeValue('');
      setChangeOtp('');
      await refreshUser();
      showToast('Contact Updated & Verified');
    } catch (err: any) {
      showToast('Verification failed', err.message, 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated successfully');
    } catch (err: any) {
      showToast('Password change failed', err.message, 'error');
    }
  };

  const handleRevokeOthers = async () => {
    const res = await apiFetch<{ revokedCount: number }>('/api/v1/auth/sessions/revoke-others', { method: 'POST' });
    showToast('Other sessions revoked', `${res.revokedCount} session(s) signed out.`);
    await loadAll();
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/support-tickets', {
        method: 'POST',
        body: JSON.stringify({ subject: tktSubject, category: tktCategory, priority: 'MEDIUM', message: tktMessage }),
      });
      setTktSubject('');
      setTktMessage('');
      showToast('Support ticket submitted', 'Super Admin support team has received your inquiry.');
      await loadAll();
    } catch (err: any) {
      showToast('Could not submit ticket', err.message, 'error');
    }
  };

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirmAction({
      title: 'Request Account Closure?',
      description: 'Financial ledgers and past stay history are retained safely per statutory rules. Your deletion request will be logged for compliance review.',
      confirmLabel: 'Confirm Request',
    });
    if (!ok) return;
    try {
      await apiFetch('/api/v1/auth/account/delete-request', {
        method: 'POST',
        body: JSON.stringify({ password: deletePassword, reason: 'User initiated closure from Tenant Profile' }),
      });
      setDeletePassword('');
      await refreshUser();
      showToast('Account deletion request logged');
    } catch (err: any) {
      showToast('Could not log request', err.message, 'error');
    }
  };

  const inputClass =
    'w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-[#111827] dark:text-[#F9FAFB]">{user?.fullName}</h1>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              {user?.email} · {user?.phone} · {user?.city || 'Hyderabad'}
            </p>
            <div className="mt-1">
              <StatusIndicator status="success" label={user?.isVerified ? 'OTP Verified Account' : 'Pending Verification'} />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] inline-flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Quick Access Menu Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Documents', to: '/tenant/my-pg?tab=documents', icon: FileCheck2 },
          { label: 'Rent History', to: '/tenant/my-pg?tab=rent', icon: Receipt },
          { label: 'Saved PGs', to: '/tenant/explore', icon: Heart },
          { label: 'Saved Events', to: '/tenant/events', icon: CalendarDays },
          { label: 'Notifications', to: '#tenant-notifications', icon: Bell },
          { label: 'Settings', to: '#tenant-preferences', icon: Settings },
          { label: 'Theme', to: '#tenant-theme', icon: Palette },
          { label: 'Help & FAQs', to: '#tenant-help', icon: HelpCircle },
        ].map((item) => {
          const Icon = item.icon;
          const isAnchor = item.to.startsWith('#');
          return isAnchor ? (
            <a
              key={item.label}
              href={item.to}
              className="min-h-[56px] p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-2.5 transition-colors"
            >
              <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">{item.label}</span>
            </a>
          ) : (
            <Link
              key={item.label}
              to={item.to}
              className="min-h-[56px] p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-2.5 transition-colors"
            >
              <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Personal Profile, Emergency Contact & Preferences */}
      <form
        id="tenant-preferences"
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Personal Details &amp; Emergency Contact</h2>
          <button
            type="submit"
            disabled={savingProfile}
            className="min-h-[40px] px-4 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
              {INDIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">Occupation</label>
            <select value={occupationStatus} onChange={(e) => setOccupationStatus(e.target.value as any)} className={inputClass}>
              <option value="WORKING_PROFESSIONAL">Working Professional</option>
              <option value="STUDENT">College Student</option>
              <option value="FOUNDER">Startup Founder</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">Emergency Contact Name</label>
            <input
              type="text"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              placeholder="Parent or guardian name"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">Emergency Contact Phone</label>
            <input
              type="text"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF] mb-1">Avatar URL (optional)</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#374151] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {[
            { key: 'emailAlerts' as const, label: 'Email Stay & Receipt Alerts' },
            { key: 'smsAlerts' as const, label: 'SMS Alerts' },
            { key: 'joiningRequests' as const, label: 'Joining Request Updates' },
            { key: 'rentReminders' as const, label: 'Monthly Rent Reminders' },
            { key: 'maintenanceAlerts' as const, label: 'Maintenance & Parcel Alerts' },
          ].map((pref) => (
            <label
              key={pref.key}
              className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between text-[#111827] dark:text-[#F9FAFB] cursor-pointer"
            >
              <span>{pref.label}</span>
              <input
                type="checkbox"
                checked={notifPrefs[pref.key]}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, [pref.key]: e.target.checked })}
              />
            </label>
          ))}
          <label className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between text-[#111827] dark:text-[#F9FAFB] cursor-pointer">
            <span>Personalized Discovery Ads</span>
            <input
              type="checkbox"
              checked={consentPersonalizedAds}
              onChange={(e) => setConsentPersonalizedAds(e.target.checked)}
            />
          </label>
        </div>
      </form>

      {/* Appearance Theme Preference */}
      <div id="tenant-theme" className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Appearance &amp; Theme</h2>
        </div>
        <ThemePreferenceSelector />
      </div>

      {/* Verified Contact Change & Password Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Update Verified Email / Phone</h2>
          </div>
          <div className="flex gap-2">
            <select
              value={changeField}
              onChange={(e) => {
                setChangeField(e.target.value as any);
                setOtpRequested(false);
              }}
              className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
            <input
              type="text"
              value={changeValue}
              onChange={(e) => setChangeValue(e.target.value)}
              placeholder={changeField === 'phone' ? 'New 10-digit mobile' : 'New email address'}
              className={inputClass}
            />
          </div>
          {!otpRequested ? (
            <button
              type="button"
              onClick={handleRequestContactChange}
              className="min-h-[40px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
            >
              Send Verification OTP
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={changeOtp}
                onChange={(e) => setChangeOtp(e.target.value)}
                placeholder="Enter 6-digit OTP (482910)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleVerifyContactChange}
                className="min-h-[44px] px-4 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold whitespace-nowrap"
              >
                Verify &amp; Save
              </button>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="pt-4 border-t border-[#E5E7EB] dark:border-[#374151] space-y-2.5">
            <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Change Password</p>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              required
              className={inputClass}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              required
              className={inputClass}
            />
            <button
              type="submit"
              className="min-h-[40px] px-4 rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-xs font-semibold"
            >
              Update Password
            </button>
          </form>
        </div>

        {/* Active Sessions */}
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Active Sessions ({sessions.length})</h2>
            </div>
            <button
              type="button"
              onClick={handleRevokeOthers}
              className="text-xs font-semibold text-[#DC2626] dark:text-[#F87171] hover:underline"
            >
              Sign out other devices
            </button>
          </div>
          {sessions.length === 0 ? (
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Current session active.</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{s.deviceLabel}</p>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                      Started {new Date(s.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <StatusIndicator status={s.isCurrent ? 'success' : 'neutral'} label={s.isCurrent ? 'Current' : 'Active'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help & Support Tickets */}
      <div id="tenant-help" className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Help, Support &amp; Platform Policies</h2>
          </div>
          {cms && (
            <button
              type="button"
              onClick={() => setShowPoliciesModal(true)}
              className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
            >
              Read Terms, Privacy &amp; FAQs
            </button>
          )}
        </div>

        <form onSubmit={handleCreateSupportTicket} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={tktSubject}
            onChange={(e) => setTktSubject(e.target.value)}
            placeholder="Support ticket subject..."
            required
            className={inputClass}
          />
          <select
            value={tktCategory}
            onChange={(e) => setTktCategory(e.target.value as any)}
            className={inputClass}
          >
            <option value="ACCOUNT">Account &amp; Profile</option>
            <option value="DISPUTE">PG Stay Dispute</option>
            <option value="PAYMENT">Rent / Deposit Ledger</option>
            <option value="SAFETY">Safety &amp; Verification</option>
            <option value="OTHER">Other</option>
          </select>
          <button type="submit" className="min-h-[44px] rounded-xl bg-[#047857] dark:bg-[#10B981] text-white dark:text-[#0B1220] text-sm font-semibold">
            Submit Support Ticket
          </button>
          <textarea
            rows={2}
            value={tktMessage}
            onChange={(e) => setTktMessage(e.target.value)}
            placeholder="Explain your issue for our Super Admin support team..."
            required
            className="sm:col-span-3 w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
          />
        </form>

        {tickets.length > 0 && (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{t.subject}</span>
                  <StatusIndicator status={t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'success' : 'warning'} label={t.status} />
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  {t.category} · {t.messages[t.messages.length - 1]?.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div id="tenant-notifications" className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Notifications</h2>
          </div>
          <button
            type="button"
            onClick={async () => {
              await apiFetch('/api/v1/admin/notifications/read-all', { method: 'POST' });
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              showToast('Notifications marked read');
            }}
            className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline"
          >
            Mark all read
          </button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No notifications yet.</p>
        ) : (
          notifications.slice(0, 6).map((n) => (
            <div
              key={n.id}
              className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{n.title}</span>
                <span className="text-[#6B7280] dark:text-[#9CA3AF]">{n.read ? 'Read' : 'New'}</span>
              </div>
              <p className="mt-1 text-xs text-[#4B5563] dark:text-[#D1D5DB]">{n.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Past Stays & Privacy + Account Deletion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Stay History &amp; Privacy</h2>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            PG Finder enforces one active stay at a time and never performs continuous background GPS tracking.
          </p>
          {pastStays.length === 0 ? (
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">No completed past stays on record.</p>
          ) : (
            pastStays.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs text-[#111827] dark:text-[#F9FAFB]"
              >
                Property {s.propertyId} · Checked out {s.checkedOutAt?.slice(0, 10)}
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleDeleteRequest}
          className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#111827] p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#DC2626] dark:text-[#F87171]" />
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Account Deletion Request</h2>
          </div>
          {user?.deletionRequestedAt ? (
            <StatusIndicator
              status="warning"
              label={`Deletion request queued (${new Date(user.deletionRequestedAt).toLocaleDateString('en-IN')})`}
            />
          ) : (
            <>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Request account closure while preserving legal stay and rent ledger history.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl border border-red-300 dark:border-red-800 text-xs font-semibold text-[#DC2626] dark:text-[#F87171] whitespace-nowrap"
                >
                  Request Closure
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <BottomSheet
        open={showPoliciesModal}
        onClose={() => setShowPoliciesModal(false)}
        title="Platform Policies & FAQs"
        maxWidthClass="sm:max-w-xl"
      >
        {cms && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] space-y-2">
              <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">Terms &amp; Stay Summary</p>
              <p className="text-[#4B5563] dark:text-[#D1D5DB]">{cms.policies.termsSummary}</p>
              <p className="font-bold text-[#111827] dark:text-[#F9FAFB] pt-2">Privacy &amp; KYC Policy</p>
              <p className="text-[#4B5563] dark:text-[#D1D5DB]">{cms.policies.privacySummary}</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">FAQs</p>
              {cms.faqs.map((f) => (
                <div key={f.id} className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151]">
                  <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{f.question}</p>
                  <p className="mt-1 text-[#6B7280] dark:text-[#9CA3AF]">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
