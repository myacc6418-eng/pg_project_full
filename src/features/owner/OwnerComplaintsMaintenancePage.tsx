import React, { useEffect, useState } from 'react';
import { MessageSquareWarning, Wrench } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  Complaint,
  ComplaintStatus,
  MaintenanceRequest,
  MaintenanceStatus,
  Property,
  StaffMember,
} from '../../../packages/shared/types';

export function OwnerComplaintsMaintenancePage({ mode }: { mode: 'complaints' | 'maintenance' }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [propertyFilter, setPropertyFilter] = useState('ALL');

  // Complaint resolution notes
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [staffAssignMap, setStaffAssignMap] = useState<Record<string, string>>({});

  // Create maintenance form
  const [mntPropId, setMntPropId] = useState('');
  const [mntTitle, setMntTitle] = useState('');
  const [mntRoom, setMntRoom] = useState('');
  const [mntCost, setMntCost] = useState('1200');
  const [mntDueDate, setMntDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [mntStaffName, setMntStaffName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const ov = await apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL');
      setProperties(ov.properties || []);
      setComplaints(ov.complaints || []);
      setMaintenance(ov.maintenanceRequests || []);
      setStaff(ov.staff || []);
      if (ov.properties?.[0] && !mntPropId) setMntPropId(ov.properties[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateComplaint = async (cmp: Complaint, nextStatus: ComplaintStatus) => {
    try {
      await apiFetch(`/api/v1/operations/owner/complaints/${cmp.id}/update`, {
        method: 'POST',
        body: JSON.stringify({
          status: nextStatus,
          assignedStaffId: staffAssignMap[cmp.id] || cmp.assignedStaffId || undefined,
          resolutionNotes: notesMap[cmp.id] || `Updated to ${nextStatus.replace(/_/g, ' ')}`,
        }),
      });
      showToast(`Complaint updated to ${nextStatus.replace(/_/g, ' ')}`);
      await loadData();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/owner/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: mntPropId,
          title: mntTitle,
          roomNumber: mntRoom || undefined,
          estimatedCostInr: Number(mntCost || 0),
          dueDate: mntDueDate,
          assignedStaffName: mntStaffName || undefined,
        }),
      });
      setMntTitle('');
      setMntRoom('');
      showToast('Maintenance task scheduled');
      await loadData();
    } catch (err: any) {
      showToast('Failed to create task', err.message, 'error');
    }
  };

  const handleUpdateMaintenance = async (item: MaintenanceRequest, status: MaintenanceStatus, logAsExpense = false) => {
    try {
      await apiFetch(`/api/v1/operations/owner/maintenance/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, logAsExpense }),
      });
      showToast(logAsExpense ? 'Completed & logged to property expenses' : `Maintenance marked ${status}`);
      await loadData();
    } catch (err: any) {
      showToast('Update failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  const filteredComplaints = complaints.filter((c) => propertyFilter === 'ALL' || c.propertyId === propertyFilter);
  const filteredMaint = maintenance.filter((m) => propertyFilter === 'ALL' || m.propertyId === propertyFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {mode === 'complaints' ? (
            <MessageSquareWarning className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
          ) : (
            <Wrench className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              {mode === 'complaints' ? 'Resident Complaints' : 'Property Maintenance'}
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              {mode === 'complaints'
                ? 'Assign staff, update status across Open / In Progress / Waiting / Resolved / Closed, and notify tenants.'
                : 'Schedule repair work, track estimated costs, and sync completed repairs directly to the expense ledger.'}
            </p>
          </div>
        </div>

        <select
          aria-label="Filter by property"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm font-medium"
        >
          <option value="ALL">All Properties ({properties.length})</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {mode === 'complaints' ? (
        <div className="space-y-4">
          {filteredComplaints.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-6 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              No complaints found.
            </div>
          ) : (
            filteredComplaints.map((c) => {
              const prop = properties.find((p) => p.id === c.propertyId);
              const propStaff = staff.filter((s) => s.propertyId === c.propertyId);
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
                        {prop?.name} · {c.tenantName} · {c.category} · Priority: {c.priority}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{c.description}</p>
                      {c.assignedStaffName && (
                        <p className="text-xs text-[#047857] dark:text-[#34D399] mt-0.5">
                          Assigned to: {c.assignedStaffName}
                        </p>
                      )}
                    </div>
                    <StatusIndicator
                      status={
                        c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED
                          ? 'success'
                          : 'warning'
                      }
                      label={c.status.replace(/_/g, ' ')}
                    />
                  </div>

                  {c.timeline && c.timeline.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] space-y-1 text-xs">
                      {c.timeline.map((t) => (
                        <p key={t.id} className="text-[#6B7280] dark:text-[#9CA3AF]">
                          <strong className="text-[#111827] dark:text-[#F9FAFB]">{t.status}</strong> — {t.note} ({t.actorName})
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 pt-2">
                    <select
                      aria-label="Assign staff"
                      value={staffAssignMap[c.id] ?? (c.assignedStaffId || '')}
                      onChange={(e) => setStaffAssignMap({ ...staffAssignMap, [c.id]: e.target.value })}
                      className="lg:col-span-3 min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                    >
                      <option value="">Assign Staff (optional)</option>
                      {propStaff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.roleTitle})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Update / resolution note..."
                      value={notesMap[c.id] || ''}
                      onChange={(e) => setNotesMap({ ...notesMap, [c.id]: e.target.value })}
                      className="lg:col-span-4 min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                    />
                    <div className="lg:col-span-5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateComplaint(c, ComplaintStatus.IN_PROGRESS)}
                        className="min-h-[38px] px-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold"
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateComplaint(c, ComplaintStatus.WAITING)}
                        className="min-h-[38px] px-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#B45309] dark:text-amber-400"
                      >
                        Waiting
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateComplaint(c, ComplaintStatus.RESOLVED)}
                        className="min-h-[38px] px-2.5 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateComplaint(c, ComplaintStatus.CLOSED)}
                        className="min-h-[38px] px-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateMaintenance}
            className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3 self-start"
          >
            <h2 className="text-base font-bold">Schedule Maintenance Work</h2>
            <select
              value={mntPropId}
              onChange={(e) => setMntPropId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Issue / Work Title (e.g. Solar water heater descaling)"
              value={mntTitle}
              onChange={(e) => setMntTitle(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Room / Area"
                value={mntRoom}
                onChange={(e) => setMntRoom(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
              <input
                type="number"
                placeholder="Est. Cost (₹)"
                value={mntCost}
                onChange={(e) => setMntCost(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={mntDueDate}
                onChange={(e) => setMntDueDate(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
              <input
                type="text"
                placeholder="Assigned technician"
                value={mntStaffName}
                onChange={(e) => setMntStaffName(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
            </div>
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Add Maintenance Ticket
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {filteredMaint.map((m) => {
              const prop = properties.find((p) => p.id === m.propertyId);
              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <StatusIndicator status={m.status === MaintenanceStatus.COMPLETED ? 'success' : 'warning'} label={m.status} />
                    <p className="mt-1 text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{m.title}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {prop?.name} {m.roomNumber ? `· Room ${m.roomNumber}` : ''} · Due {m.dueDate} · Est. {formatInr(m.estimatedCostInr)}
                    </p>
                  </div>
                  {m.status !== MaintenanceStatus.COMPLETED && (
                    <div className="flex flex-wrap gap-2">
                      {m.status === MaintenanceStatus.PENDING && (
                        <button
                          type="button"
                          onClick={() => handleUpdateMaintenance(m, MaintenanceStatus.IN_PROGRESS)}
                          className="min-h-[36px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold"
                        >
                          Start
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUpdateMaintenance(m, MaintenanceStatus.COMPLETED, true)}
                        className="min-h-[36px] px-3 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                      >
                        Complete &amp; Log Expense
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
