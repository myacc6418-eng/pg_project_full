import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { SubscriptionTier } from '../../../packages/shared/types';

type TrackingTab =
  | 'approvals'
  | 'locations'
  | 'beds'
  | 'joining'
  | 'rent'
  | 'dues'
  | 'complaints'
  | 'maintenance'
  | 'checkouts'
  | 'staffTasks'
  | 'billing';

export function OwnerTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TrackingTab>('approvals');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiFetch<any>('/api/v1/operations/owner/tracking')
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <CardSkeleton rows={4} />;

  const tabs: { id: TrackingTab; label: string; count?: number }[] = [
    { id: 'approvals', label: 'Approvals', count: data.approvals?.length },
    { id: 'locations', label: 'Locations', count: data.locations?.length },
    { id: 'beds', label: 'Beds & Inventory', count: data.beds?.length },
    { id: 'joining', label: 'Joining Requests', count: data.joiningRequests?.length },
    { id: 'rent', label: 'Rent & Receipts', count: data.rentCharges?.length },
    { id: 'dues', label: 'Outstanding Dues', count: data.outstandingDues?.length },
    { id: 'complaints', label: 'Complaints', count: data.complaints?.length },
    { id: 'maintenance', label: 'Maintenance', count: data.maintenanceRequests?.length },
    { id: 'checkouts', label: 'Checkouts', count: data.checkouts?.length },
    { id: 'staffTasks', label: 'Staff Tasks', count: data.staffTasks?.length },
    { id: 'billing', label: 'Subscriptions & Billing', count: data.transactions?.length },
  ];

  const tier: SubscriptionTier = data.tier || SubscriptionTier.BASIC;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              11-Tab Operational Tracking Center
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Unified live status tracking across approvals, locations, inventory, joining, rent, dues, and staff.
            </p>
          </div>
        </div>
        <div className="px-3.5 py-2 rounded-xl border border-[#047857]/30 bg-[#ECFDF5] dark:bg-[#10B981]/10 text-xs font-semibold text-[#047857] dark:text-[#34D399] inline-flex items-center gap-1.5 self-start">
          <ShieldCheck className="w-4 h-4" />
          Active Depth: {tier} Plan
        </div>
      </div>

      {/* Tier Depth Notice */}
      {tier !== SubscriptionTier.BUSINESS && (
        <div className="rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-[#6B7280] dark:text-[#9CA3AF]">
            {tier === SubscriptionTier.BASIC
              ? 'Basic Tracking includes latest status snapshots. Upgrade to Pro for full verification timelines & dues history, or Business for staff task tracking.'
              : 'Pro Tracking includes full timelines and all dues. Upgrade to Business to unlock multi-PG staff task tracking.'}
          </span>
          <Link to="/owner/subscriptions" className="font-semibold text-[#047857] dark:text-[#34D399] hover:underline whitespace-nowrap">
            View Plans →
          </Link>
        </div>
      )}

      {/* 11 Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-[#047857] text-white'
                : 'border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
            }`}
          >
            {t.label} {typeof t.count === 'number' ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        {tab === 'approvals' &&
          (data.approvals || []).map((a: any) => (
            <div key={a.propertyId} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] space-y-1">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold">{a.propertyName}</p>
                <StatusIndicator status={a.status === 'APPROVED' ? 'success' : 'warning'} label={a.status} />
              </div>
              {a.reason && <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Note: {a.reason}</p>}
              {(a.history || []).map((h: any) => (
                <p key={h.id} className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  • {h.previousStatus} → {h.newStatus} ({h.actorName})
                </p>
              ))}
            </div>
          ))}

        {tab === 'locations' &&
          (data.locations || []).map((l: any) => (
            <div key={l.propertyId} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] space-y-1">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold">{l.propertyName}</p>
                <StatusIndicator status={l.status === 'VERIFIED' ? 'success' : 'warning'} label={l.status} />
              </div>
              {l.notes && <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Notes: {l.notes}</p>}
            </div>
          ))}

        {tab === 'beds' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(data.beds || []).map((b: any) => (
              <div key={b.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
                <p className="font-mono text-xs font-bold">{b.bedCode}</p>
                <StatusIndicator
                  status={b.status === 'AVAILABLE' ? 'success' : b.status === 'OCCUPIED' ? 'info' : 'warning'}
                  label={b.status}
                />
              </div>
            ))}
          </div>
        )}

        {tab === 'joining' &&
          (data.joiningRequests || []).map((jr: any) => (
            <div key={jr.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
              <div>
                <p className="font-bold text-sm">{jr.tenantName}</p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                  {jr.preferredRoomType} · Move-in {jr.moveInDate}
                </p>
              </div>
              <StatusIndicator status={jr.status === 'ACTIVE' ? 'success' : 'warning'} label={jr.status} />
            </div>
          ))}

        {tab === 'rent' &&
          (data.rentCharges || []).map((rc: any) => (
            <div key={rc.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
              <div>
                <p className="font-bold">Month {rc.billingMonth} {rc.receiptNumber ? `· ${rc.receiptNumber}` : ''}</p>
                <p className="font-mono">{formatInr(rc.paidAmountInr)} / {formatInr(rc.amountInr + (rc.lateFeeInr || 0))}</p>
              </div>
              <StatusIndicator status={rc.status === 'PAID' ? 'success' : 'warning'} label={rc.status} />
            </div>
          ))}

        {tab === 'dues' &&
          (data.outstandingDues || []).map((d: any) => (
            <div key={d.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
              <div>
                <p className="font-bold">{d.tenantName} {d.isFormerTenant ? '(Former)' : ''}</p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">{d.description}</p>
              </div>
              <span className="font-mono font-bold">{formatInr(d.totalAmountInr - d.paidAmountInr)} ({d.status})</span>
            </div>
          ))}

        {tab === 'complaints' &&
          (data.complaints || []).map((c: any) => (
            <div key={c.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
              <div>
                <p className="font-bold">{c.tenantName} · {c.category}</p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">{c.description}</p>
              </div>
              <StatusIndicator status={c.status === 'RESOLVED' ? 'success' : 'warning'} label={c.status} />
            </div>
          ))}

        {tab === 'maintenance' &&
          (data.maintenanceRequests || []).map((m: any) => (
            <div key={m.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
              <div>
                <p className="font-bold">{m.title}</p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">Due {m.dueDate} · Est {formatInr(m.estimatedCostInr)}</p>
              </div>
              <StatusIndicator status={m.status === 'COMPLETED' ? 'success' : 'warning'} label={m.status} />
            </div>
          ))}

        {tab === 'checkouts' &&
          (data.checkouts || []).map((st: any) => (
            <div key={st.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
              <p className="font-bold">{st.tenantName}</p>
              <StatusIndicator status={st.status === 'CHECKED_OUT' ? 'neutral' : 'warning'} label={st.status} />
            </div>
          ))}

        {tab === 'staffTasks' &&
          (tier !== SubscriptionTier.BUSINESS ? (
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Upgrade to Business Plan to track multi-property staff tasks in the Tracking Center.
            </p>
          ) : (
            (data.staffTasks || []).map((t: any) => (
              <div key={t.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
                <div>
                  <p className="font-bold">{t.title}</p>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">{t.staffName} · Due {t.dueDate}</p>
                </div>
                <StatusIndicator status={t.status === 'COMPLETED' ? 'success' : 'warning'} label={t.status} />
              </div>
            ))
          ))}

        {tab === 'billing' &&
          (data.transactions || []).map((tx: any) => (
            <div key={tx.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
              <div>
                <p className="font-bold">{tx.description}</p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">{new Date(tx.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <span className="font-mono font-bold text-[#047857] dark:text-[#34D399]">{formatInr(tx.amountInr)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
