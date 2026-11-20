import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, History, Settings, CheckCheck, Search, UserCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ThemePreferenceSelector } from '../../hooks/useTheme';
import { CardSkeleton, StatusIndicator } from '../../components/ui/CommonUI';
import { ActivityLogEntry, NotificationItem } from '../../../packages/shared/types';

export function OwnerNotificationsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ notifications: NotificationItem[] }>('/api/v1/admin/notifications');
      setItems(res.notifications || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/v1/admin/notifications/read-all', { method: 'POST' });
      showToast('All notifications marked read');
      await loadNotifications();
    } catch (err: any) {
      showToast('Failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Bell className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Notifications</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Property approvals, location verification updates, joining requests, and checkout alerts.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="min-h-[40px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 ${
                n.read
                  ? 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827]'
                  : 'border-[#047857]/40 bg-[#ECFDF5]/60 dark:bg-[#10B981]/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{n.title}</p>
                <StatusIndicator status={n.read ? 'neutral' : 'info'} label={n.read ? 'Read' : 'New'} />
              </div>
              <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{n.body}</p>
              <p className="mt-1.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                {n.category} · {new Date(n.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function OwnerActivityLogPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL')
      .then((res) => setLogs(res.activityLogs || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton rows={4} />;

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorName.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      (l.newValue || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <History className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Activity &amp; Audit Log</h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Immutable audit trail across property edits, bed transfers, payments, document reviews, and checkouts.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter action, actor, value..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-[#6B7280] dark:text-[#9CA3AF]">
            <tr>
              <th className="p-3.5 font-semibold">Timestamp</th>
              <th className="p-3.5 font-semibold">Actor</th>
              <th className="p-3.5 font-semibold">Action</th>
              <th className="p-3.5 font-semibold">Entity</th>
              <th className="p-3.5 font-semibold">Previous</th>
              <th className="p-3.5 font-semibold">New Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
            {filtered.map((l) => (
              <tr key={l.id}>
                <td className="p-3.5 font-mono text-[11px] whitespace-nowrap">{new Date(l.timestamp).toLocaleString('en-IN')}</td>
                <td className="p-3.5 font-semibold">{l.actorName}</td>
                <td className="p-3.5 font-mono text-[#047857] dark:text-[#34D399] font-semibold">{l.action}</td>
                <td className="p-3.5">{l.entityType}</td>
                <td className="p-3.5 text-[#6B7280] dark:text-[#9CA3AF]">{l.previousValue || '—'}</td>
                <td className="p-3.5">{l.newValue || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OwnerSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [city, setCity] = useState(user?.city || 'Hyderabad');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/v1/operations/owner/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, businessName, city }),
      });
      await refreshUser();
      showToast('Owner profile updated');
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2.5">
        <Settings className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Owner Settings</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Configure your operator business profile and PG Finder Light / Dark / System theme.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#047857]/25 dark:border-[#34D399]/30 bg-[#ECFDF5]/60 dark:bg-[#10B981]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <UserCircle className="w-5 h-5 text-[#047857] dark:text-[#34D399] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
              Full Owner Profile, Password &amp; Active Sessions
            </p>
            <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
              Manage verified phone/email changes, notification toggles, active device sessions, and account preferences.
            </p>
          </div>
        </div>
        <Link
          to="/owner/profile"
          className="min-h-[40px] px-4 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center"
        >
          Open Owner Profile
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
      >
        <h2 className="text-base font-bold">Business &amp; Operator Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">PG Brand / Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Primary City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Registered Email</label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-slate-100 dark:bg-[#0B1220] text-sm opacity-75"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-sm font-semibold"
        >
          {saving ? 'Saving...' : 'Save Operator Profile'}
        </button>
      </form>

      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <h2 className="text-base font-bold">Appearance &amp; Theme</h2>
        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
          Your selected theme applies seamlessly across all PG Finder modules and persists across sessions.
        </p>
        <ThemePreferenceSelector />
      </div>
    </div>
  );
}
