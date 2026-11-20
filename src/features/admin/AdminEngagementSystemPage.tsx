import React, { useEffect, useState } from 'react';
import { BellRing, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, StatusIndicator } from '../../components/ui/CommonUI';
import { BroadcastNotificationRecord, PlatformCmsContent } from '../../../packages/shared/types';
import { ThemePreferenceSelector } from '../../hooks/useTheme';

export function AdminEngagementSystemPage({
  section,
}: {
  section: 'notifications' | 'cms' | 'audit' | 'activity' | 'settings';
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastNotificationRecord[]>([]);
  const [cms, setCms] = useState<PlatformCmsContent | null>(null);
  const [logSearch, setLogSearch] = useState('');

  // Broadcast form
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody] = useState('');
  const [bAudience, setBAudience] = useState<'ALL' | 'TENANTS' | 'PG_OWNERS'>('ALL');
  const [bCategory, setBCategory] = useState('ANNOUNCEMENT');

  // New FAQ
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  const [faqAudience, setFaqAudience] = useState<'ALL' | 'TENANTS' | 'PG_OWNERS'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      if (section === 'notifications') {
        const res = await apiFetch<{ broadcasts: BroadcastNotificationRecord[] }>('/api/v1/admin/broadcasts');
        setBroadcasts(res.broadcasts);
      } else if (section === 'cms') {
        const res = await apiFetch<{ cms: PlatformCmsContent }>('/api/v1/admin/cms');
        setCms(res.cms);
      } else {
        const ov = await apiFetch('/api/v1/admin/overview');
        setOverview(ov);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLogSearch('');
    loadData();
  }, [section]);

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ broadcast: BroadcastNotificationRecord }>('/api/v1/admin/broadcasts', {
        method: 'POST',
        body: JSON.stringify({
          title: bTitle,
          body: bBody,
          targetAudience: bAudience,
          category: bCategory,
        }),
      });
      setBTitle('');
      setBBody('');
      showToast('Broadcast Sent', `Delivered to ${res.broadcast.sentCount} users`);
      await loadData();
    } catch (err: any) {
      showToast('Broadcast failed', err.message, 'error');
    }
  };

  const saveCms = async () => {
    if (!cms) return;
    try {
      const res = await apiFetch<{ cms: PlatformCmsContent }>('/api/v1/admin/cms', {
        method: 'PUT',
        body: JSON.stringify(cms),
      });
      setCms(res.cms);
      showToast('CMS Content Saved');
    } catch (err: any) {
      showToast('CMS update failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={3} />;

  const inputClass =
    'w-full min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
          {section === 'notifications'
            ? 'Broadcast Notifications'
            : section === 'cms'
              ? 'Platform CMS & Policies'
              : section === 'audit'
                ? 'Immutable Admin Audit Logs'
                : section === 'activity'
                  ? 'Platform Activity Log'
                  : 'Integrations & Workspace Settings'}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          {section === 'notifications'
            ? 'Send audience-targeted announcements to all users, PG owners, or tenants with automatic 60-second deduplication.'
            : section === 'cms'
              ? 'Manage structured announcement banners, landing highlights, FAQs, and policy summaries.'
              : section === 'audit'
                ? 'Append-only compliance and sensitive access audit trail.'
                : section === 'activity'
                  ? 'Operational events logged across PG owners, staff, and residents.'
                  : 'Workspace theme and honest status of external service integrations.'}
        </p>
      </div>

      {section === 'notifications' && (
        <div className="space-y-6">
          <form
            onSubmit={sendBroadcast}
            className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
          >
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              Compose Broadcast Notification
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Notification Title"
                value={bTitle}
                onChange={(e) => setBTitle(e.target.value)}
                required
                className={`sm:col-span-2 ${inputClass}`}
              />
              <select
                value={bAudience}
                onChange={(e) => setBAudience(e.target.value as any)}
                className={inputClass}
              >
                <option value="ALL">All Users (Tenants + PG Owners)</option>
                <option value="TENANTS">Tenants Only</option>
                <option value="PG_OWNERS">PG Owners Only</option>
              </select>
            </div>
            <textarea
              rows={3}
              placeholder="Write clear announcement details..."
              value={bBody}
              onChange={(e) => setBBody(e.target.value)}
              required
              className="w-full p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select value={bCategory} onChange={(e) => setBCategory(e.target.value)} className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-xs">
                <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
                <option value="COMPLIANCE">COMPLIANCE</option>
                <option value="EVENT">EVENT</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
              <button type="submit" className="min-h-[44px] px-5 rounded-xl bg-[#047857] text-white text-sm font-semibold">
                Send Broadcast
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Sent Broadcasts History</h2>
            {broadcasts.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No broadcasts sent yet.</p>
            ) : (
              broadcasts.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{b.title}</p>
                    <span className="text-xs font-mono text-[#047857] dark:text-[#34D399]">{b.sentCount} recipients</span>
                  </div>
                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] mt-1">{b.body}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                    Audience: {b.targetAudience} · {b.category} · {new Date(b.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {section === 'cms' && cms && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Platform Announcement Banner</h2>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={cms.announcementBanner.enabled}
                  onChange={(e) =>
                    setCms({
                      ...cms,
                      announcementBanner: { ...cms.announcementBanner, enabled: e.target.checked },
                    })
                  }
                />
                Enabled
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={cms.announcementBanner.title}
                onChange={(e) =>
                  setCms({ ...cms, announcementBanner: { ...cms.announcementBanner, title: e.target.value } })
                }
                placeholder="Banner Title"
                className={`sm:col-span-2 ${inputClass}`}
              />
              <select
                value={cms.announcementBanner.audience}
                onChange={(e) =>
                  setCms({
                    ...cms,
                    announcementBanner: { ...cms.announcementBanner, audience: e.target.value as any },
                  })
                }
                className={inputClass}
              >
                <option value="ALL">ALL</option>
                <option value="TENANTS">TENANTS</option>
                <option value="PG_OWNERS">PG_OWNERS</option>
              </select>
            </div>
            <input
              type="text"
              value={cms.announcementBanner.message}
              onChange={(e) =>
                setCms({ ...cms, announcementBanner: { ...cms.announcementBanner, message: e.target.value } })
              }
              placeholder="Banner message..."
              className={inputClass}
            />
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">FAQs ({cms.faqs.length})</h2>
            <div className="space-y-2.5">
              {cms.faqs.map((faq) => (
                <div key={faq.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
                      [{faq.audience}] {faq.question}
                    </p>
                    <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] mt-1">{faq.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCms({ ...cms, faqs: cms.faqs.filter((f) => f.id !== faq.id) })}
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#DC2626] dark:text-red-400"
                    aria-label="Remove FAQ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
              <input type="text" placeholder="New FAQ question" value={faqQ} onChange={(e) => setFaqQ(e.target.value)} className={inputClass} />
              <input type="text" placeholder="Answer summary" value={faqA} onChange={(e) => setFaqA(e.target.value)} className={inputClass} />
              <div className="flex gap-2">
                <select value={faqAudience} onChange={(e) => setFaqAudience(e.target.value as any)} className={inputClass}>
                  <option value="ALL">ALL</option>
                  <option value="TENANTS">TENANTS</option>
                  <option value="PG_OWNERS">PG_OWNERS</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!faqQ.trim() || !faqA.trim()) return;
                    setCms({
                      ...cms,
                      faqs: [
                        ...cms.faqs,
                        { id: `faq_${Date.now()}`, question: faqQ.trim(), answer: faqA.trim(), audience: faqAudience },
                      ],
                    });
                    setFaqQ('');
                    setFaqA('');
                  }}
                  className="min-h-[42px] px-3 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] text-xs font-semibold shrink-0 inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Platform Policies &amp; House Rules Template</h2>
            <div>
              <label className="block text-xs font-semibold mb-1">Terms Summary</label>
              <textarea
                rows={2}
                value={cms.policies.termsSummary}
                onChange={(e) => setCms({ ...cms, policies: { ...cms.policies, termsSummary: e.target.value } })}
                className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Privacy &amp; KYC Summary</label>
              <textarea
                rows={2}
                value={cms.policies.privacySummary}
                onChange={(e) => setCms({ ...cms, policies: { ...cms.policies, privacySummary: e.target.value } })}
                className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Default Resident House Rules Template</label>
              <textarea
                rows={2}
                value={cms.policies.residentRulesTemplate}
                onChange={(e) =>
                  setCms({ ...cms, policies: { ...cms.policies, residentRulesTemplate: e.target.value } })
                }
                className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>
            <button type="button" onClick={saveCms} className="min-h-[44px] px-5 rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Save All CMS Changes
            </button>
          </section>
        </div>
      )}

      {(section === 'audit' || section === 'activity') && overview && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
          <input
            type="text"
            placeholder="Filter logs by action, actor, target, or details..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className={inputClass}
          />
          <div className="space-y-2.5">
            {(section === 'audit' ? overview.auditLogs : overview.activityLogs)
              .filter((item: any) => {
                if (!logSearch.trim()) return true;
                const q = logSearch.toLowerCase();
                return (
                  (item.action || '').toLowerCase().includes(q) ||
                  (item.actorName || '').toLowerCase().includes(q) ||
                  (item.details || '').toLowerCase().includes(q) ||
                  (item.newValue || '').toLowerCase().includes(q)
                );
              })
              .map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-xs"
                >
                  <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {log.action} · {log.targetType || log.entityType} ({log.targetId || log.entityId})
                  </p>
                  <p className="text-[#4B5563] dark:text-[#D1D5DB] mt-0.5">
                    {log.details || `${log.previousValue || ''} → ${log.newValue || ''}`}
                  </p>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                    Actor: {log.actorName} ({log.actorRole}) · {new Date(log.createdAt || log.timestamp).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}

      {section === 'settings' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Workspace Theme Preference</h2>
            <ThemePreferenceSelector />
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">System Integrations Status (Honest Disclosure)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { name: 'SMS & Email OTP Provider', status: 'Demo Code Mode (123456)', state: 'warning' as const },
                { name: 'Platform Billing & Checkout', status: 'Recorded Test Ledger (No Live PG Capture)', state: 'warning' as const },
                { name: 'PG Owner Rent Ledger', status: 'Manual / Offline Receipt Recording Active', state: 'success' as const },
                { name: 'Capacitor Google AdMob', status: 'Configurable Test/Prod Units (Reporting API Not Connected)', state: 'info' as const },
                { name: 'Location Verification Pins', status: 'Manual Admin Coordinate Review & External Map Links', state: 'success' as const },
                { name: 'KYC Document Compliance', status: 'Lawful IDs Only (Aadhaar / UIDAI Strictly Blocked)', state: 'success' as const },
              ].map((intg) => (
                <div
                  key={intg.name}
                  className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">{intg.name}</p>
                    <p className="text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{intg.status}</p>
                  </div>
                  <StatusIndicator status={intg.state} label={intg.state.toUpperCase()} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
