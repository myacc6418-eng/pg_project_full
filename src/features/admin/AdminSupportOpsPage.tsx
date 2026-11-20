import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { SupportTicket } from '../../../packages/shared/types';

export function AdminSupportOpsPage({
  section,
}: {
  section: 'joining' | 'stays' | 'checkouts' | 'complaints' | 'support';
}) {
  const { showToast } = useToast();
  const [ops, setOps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketStatus, setTicketStatus] = useState<SupportTicket['status']>('IN_PROGRESS');
  const [assignedTo, setAssignedTo] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [replyText, setReplyText] = useState('');

  const loadOps = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/admin/operations');
      setOps(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStatusFilter('ALL');
    setSearch('');
    loadOps();
  }, [section]);

  const openTicketSheet = (t: SupportTicket) => {
    setActiveTicket(t);
    setTicketStatus(t.status);
    setAssignedTo(t.assignedTo || 'Super Admin Ops');
    setResolutionNotes(t.resolutionNotes || '');
    setReplyText('');
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    try {
      const res = await apiFetch<{ ticket: SupportTicket }>(
        `/api/v1/admin/support-tickets/${activeTicket.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: ticketStatus,
            assignedTo,
            resolutionNotes,
            reply: replyText.trim() || undefined,
          }),
        }
      );
      showToast('Support Ticket Updated', `Status set to ${res.ticket.status}`);
      setActiveTicket(res.ticket);
      setReplyText('');
      await loadOps();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  if (loading || !ops) return <CardSkeleton rows={3} />;

  const q = search.trim().toLowerCase();
  const inputClass =
    'min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
          {section === 'joining'
            ? 'Platform Joining Requests'
            : section === 'stays'
              ? 'Active & Historical Resident Stays'
              : section === 'checkouts'
                ? 'Checkout Requests & Exit Records'
                : section === 'complaints'
                  ? 'PG Complaints Oversight'
                  : 'Support Tickets & Disputes'}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Operational visibility across tenant onboarding, active residency, exit handovers, and platform dispute resolution.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search resident, PG property, subject, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} flex-1 min-w-[220px]`}
        />
        {section === 'support' && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
            <option value="ALL">All Ticket Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_RESPONSE">Waiting For Response</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        )}
      </div>

      {section === 'joining' && (
        <div className="space-y-3">
          {ops.joiningRequests
            .filter(
              (j: any) =>
                !q ||
                j.tenantName.toLowerCase().includes(q) ||
                j.propertyName.toLowerCase().includes(q) ||
                j.status.toLowerCase().includes(q)
            )
            .map((j: any) => (
              <div
                key={j.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {j.tenantName} → {j.propertyName}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {j.tenantPhone} · {j.preferredRoomType} · Move-in {j.moveInDate} · Origin: {j.origin || 'DIRECT'}
                    {j.assignedRoomNumber ? ` · Room ${j.assignedRoomNumber} Bed ${j.assignedBedCode}` : ''}
                  </p>
                </div>
                <StatusIndicator
                  status={j.status === 'ACTIVE' ? 'success' : j.status === 'REJECTED' || j.status === 'CANCELLED' ? 'error' : 'warning'}
                  label={j.status.replace(/_/g, ' ')}
                />
              </div>
            ))}
        </div>
      )}

      {(section === 'stays' || section === 'checkouts') && (
        <div className="space-y-3">
          {ops.stays
            .filter((s: any) =>
              section === 'checkouts'
                ? s.status === 'CHECKOUT_REQUESTED' || s.status === 'CHECKED_OUT'
                : true
            )
            .filter(
              (s: any) =>
                !q ||
                s.tenantName.toLowerCase().includes(q) ||
                s.propertyName.toLowerCase().includes(q) ||
                (s.tenantCode || '').toLowerCase().includes(q)
            )
            .map((s: any) => (
              <div
                key={s.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {s.tenantName} ({s.tenantCode || s.id}) · {s.propertyName}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                    Room {s.roomNumber} · Bed {s.bedCode} · Rent {formatInr(s.monthlyRentInr)}/mo · Deposit {formatInr(s.securityDepositInr)}
                    {s.expectedCheckoutDate ? ` · Expected Exit: ${s.expectedCheckoutDate}` : ''}
                  </p>
                </div>
                <StatusIndicator
                  status={s.status === 'ACTIVE' ? 'success' : s.status === 'CHECKOUT_REQUESTED' ? 'warning' : 'neutral'}
                  label={s.status.replace(/_/g, ' ')}
                />
              </div>
            ))}
        </div>
      )}

      {section === 'complaints' && (
        <div className="space-y-3">
          {ops.complaints
            .filter(
              (c: any) =>
                !q ||
                c.tenantName.toLowerCase().includes(q) ||
                c.propertyName.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q)
            )
            .map((c: any) => (
              <div
                key={c.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {c.propertyName} · {c.tenantName} · {c.category} · Priority {c.priority}
                  </p>
                  <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] mt-1">{c.description}</p>
                  {c.resolutionNotes && (
                    <p className="text-xs text-[#047857] dark:text-[#34D399] mt-1">Owner Notes: {c.resolutionNotes}</p>
                  )}
                </div>
                <StatusIndicator
                  status={c.status === 'RESOLVED' || c.status === 'CLOSED' ? 'success' : 'warning'}
                  label={c.status.replace(/_/g, ' ')}
                />
              </div>
            ))}
        </div>
      )}

      {section === 'support' && (
        <div className="space-y-3">
          {ops.supportTickets
            .filter((t: SupportTicket) => (statusFilter === 'ALL' ? true : t.status === statusFilter))
            .filter(
              (t: SupportTicket) =>
                !q ||
                t.subject.toLowerCase().includes(q) ||
                t.userName.toLowerCase().includes(q) ||
                t.category.toLowerCase().includes(q)
            )
            .map((t: SupportTicket) => (
              <div
                key={t.id}
                className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {t.userName} ({t.userRole}) · {t.category} · Priority {t.priority}
                    {t.assignedTo ? ` · Assigned: ${t.assignedTo}` : ''}
                  </p>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] mt-0.5">{t.subject}</p>
                  <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] mt-1">
                    {t.messages[t.messages.length - 1]?.body || 'No messages yet'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusIndicator
                    status={t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'success' : 'warning'}
                    label={t.status.replace(/_/g, ' ')}
                  />
                  <button
                    type="button"
                    onClick={() => openTicketSheet(t)}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Manage
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <BottomSheet
        open={Boolean(activeTicket)}
        onClose={() => setActiveTicket(null)}
        title={`Support Ticket — ${activeTicket?.subject || ''}`}
        maxWidthClass="sm:max-w-xl"
      >
        {activeTicket && (
          <form onSubmit={handleUpdateTicket} className="space-y-4">
            <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              {activeTicket.messages.map((m) => (
                <div key={m.id} className="text-xs">
                  <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {m.senderName} ({m.senderRole}) · {new Date(m.createdAt).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[#4B5563] dark:text-[#D1D5DB]">{m.body}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Status</label>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value as SupportTicket['status'])}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="WAITING_FOR_RESPONSE">WAITING_FOR_RESPONSE</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Assigned To</label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Reply to User</label>
              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a direct response to the tenant or PG owner..."
                className="w-full p-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Internal / Resolution Notes</label>
              <input
                type="text"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Summary of resolution or escalation action..."
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold"
            >
              Save Ticket Update
            </button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
