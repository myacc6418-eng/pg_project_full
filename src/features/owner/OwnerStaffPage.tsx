import React, { useEffect, useState } from 'react';
import { UserCheck, CheckCircle2, ClipboardList, Banknote } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  OwnerSubscription,
  PayrollRecord,
  Property,
  StaffMember,
  StaffTask,
  SubscriptionTier,
} from '../../../packages/shared/types';
import { STAFF_PERMISSION_OPTIONS } from '../../../packages/shared/constants';

export function OwnerStaffPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);

  // Forms
  const [propId, setPropId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTitle, setRoleTitle] = useState('CARETAKER');
  const [salary, setSalary] = useState('16000');
  const [permissions, setPermissions] = useState<string[]>(['VIEW_RESIDENTS', 'LOG_PARCELS']);

  const [taskStaffId, setTaskStaffId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState(new Date().toISOString().slice(0, 10));

  const [payStaffId, setPayStaffId] = useState('');
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payBonus, setPayBonus] = useState('0');
  const [payDeduction, setPayDeduction] = useState('0');

  const loadData = async () => {
    setLoading(true);
    try {
      const ov = await apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL');
      setSubscription(ov.subscription);
      setProperties(ov.properties || []);
      setStaff(ov.staff || []);
      setTasks(ov.staffTasks || []);
      setPayroll(ov.payrollRecords || []);
      if (ov.properties?.[0] && !propId) setPropId(ov.properties[0].id);
      if (ov.staff?.[0]) {
        if (!taskStaffId) setTaskStaffId(ov.staff[0].id);
        if (!payStaffId) setPayStaffId(ov.staff[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpgradeBusiness = async () => {
    try {
      await apiFetch('/api/v1/monetization/owner/subscribe', {
        method: 'POST',
        body: JSON.stringify({ tier: SubscriptionTier.BUSINESS }),
      });
      showToast('Upgraded to Business Plan', 'Staff management, attendance, and payroll are now unlocked.');
      await loadData();
    } catch (err: any) {
      showToast('Upgrade failed', err.message, 'error');
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/owner/staff', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: propId,
          fullName,
          phone,
          roleTitle,
          monthlySalaryInr: Number(salary),
          permissions,
        }),
      });
      setFullName('');
      setPhone('');
      showToast('Staff member added');
      await loadData();
    } catch (err: any) {
      showToast('Could not add staff', err.message, 'error');
    }
  };

  const handleMarkAttendance = async (staffId: string) => {
    try {
      await apiFetch(`/api/v1/operations/owner/staff/${staffId}/attendance`, { method: 'POST' });
      showToast('Attendance logged (+1 day)');
      await loadData();
    } catch (err: any) {
      showToast('Attendance failed', err.message, 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/owner/staff/tasks', {
        method: 'POST',
        body: JSON.stringify({ staffId: taskStaffId, title: taskTitle, dueDate: taskDue }),
      });
      setTaskTitle('');
      showToast('Staff task assigned');
      await loadData();
    } catch (err: any) {
      showToast('Could not assign task', err.message, 'error');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/v1/operations/owner/staff/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      showToast('Task completed');
      await loadData();
    } catch (err: any) {
      showToast('Task update failed', err.message, 'error');
    }
  };

  const handleIssuePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/owner/staff/payroll', {
        method: 'POST',
        body: JSON.stringify({
          staffId: payStaffId,
          month: payMonth,
          bonusInr: Number(payBonus || 0),
          deductionInr: Number(payDeduction || 0),
        }),
      });
      showToast('Payroll Payout Issued', 'Salary expense recorded in property finance ledger.');
      await loadData();
    } catch (err: any) {
      showToast('Payroll failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  const isBusiness = subscription?.tier === SubscriptionTier.BUSINESS;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <UserCheck className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Staff, Attendance &amp; Payroll
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Role-limited staff accounts, task scheduling, daily attendance logs, and salary payouts.
          </p>
        </div>
      </div>

      {!isBusiness && (
        <div className="rounded-2xl border border-[#047857]/30 bg-[#ECFDF5] dark:bg-[#10B981]/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#065F46] dark:text-[#34D399]">
              Business Plan Required ({subscription?.tier || 'BASIC'} Active)
            </h2>
            <p className="mt-1 text-sm text-[#047857] dark:text-[#A7F3D0]">
              Upgrade to the Business Plan (₹499/mo) to create staff accounts, configure role permissions, assign tasks, log attendance, and run monthly payroll.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpgradeBusiness}
            className="min-h-[44px] px-5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            Upgrade to Business Plan (₹499/mo)
          </button>
        </div>
      )}

      {isBusiness && (
        <>
          {/* Add Staff Member */}
          <form onSubmit={handleAddStaff} className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <h2 className="text-base font-bold">Add Staff Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <select
                value={propId}
                onChange={(e) => setPropId(e.target.value)}
                className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
              <input
                type="tel"
                placeholder="10-digit Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
              <select
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              >
                <option value="CARETAKER">Caretaker</option>
                <option value="COOK">Cook</option>
                <option value="HOUSEKEEPING">Housekeeping</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
              <input
                type="number"
                placeholder="Salary (₹)"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {STAFF_PERMISSION_OPTIONS.map((perm) => {
                const checked = permissions.includes(perm);
                return (
                  <label key={perm} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setPermissions((prev) =>
                          checked ? prev.filter((x) => x !== perm) : [...prev, perm]
                        )
                      }
                    />
                    {perm.replace(/_/g, ' ')}
                  </label>
                );
              })}
            </div>

            <button type="submit" className="min-h-[42px] px-5 rounded-xl bg-[#047857] text-white text-xs font-semibold">
              Create Staff Profile
            </button>
          </form>

          {/* Staff Roster */}
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold">Staff Directory ({staff.length})</h2>
            {staff.map((st) => (
              <div key={st.id} className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{st.fullName} · {st.roleTitle}</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {st.phone} · Salary {formatInr(st.monthlySalaryInr)}/mo · {st.attendanceDaysThisMonth} days present
                  </p>
                  <p className="text-[11px] text-[#047857] dark:text-[#34D399] mt-0.5">
                    Permissions: {st.permissions.join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleMarkAttendance(st.id)}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Attendance Today
                </button>
              </div>
            ))}
          </div>

          {/* Tasks & Payroll */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                <h2 className="text-base font-bold">Staff Tasks</h2>
              </div>
              <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={taskStaffId}
                  onChange={(e) => setTaskStaffId(e.target.value)}
                  className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                />
                <button type="submit" className="min-h-[40px] rounded-xl bg-[#047857] text-white text-xs font-semibold">
                  Assign Task
                </button>
              </form>
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold">{t.title}</p>
                      <p className="text-[#6B7280] dark:text-[#9CA3AF]">{t.staffName} · Due {t.dueDate}</p>
                    </div>
                    {t.status !== 'COMPLETED' ? (
                      <button
                        type="button"
                        onClick={() => handleCompleteTask(t.id)}
                        className="min-h-[32px] px-3 rounded-lg bg-[#047857] text-white font-semibold"
                      >
                        Complete
                      </button>
                    ) : (
                      <StatusIndicator status="success" label="COMPLETED" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
                <h2 className="text-base font-bold">Monthly Payroll</h2>
              </div>
              <form onSubmit={handleIssuePayroll} className="grid grid-cols-2 gap-2">
                <select
                  value={payStaffId}
                  onChange={(e) => setPayStaffId(e.target.value)}
                  className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
                <input
                  type="month"
                  value={payMonth}
                  onChange={(e) => setPayMonth(e.target.value)}
                  className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                />
                <input
                  type="number"
                  placeholder="Bonus (₹)"
                  value={payBonus}
                  onChange={(e) => setPayBonus(e.target.value)}
                  className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                />
                <input
                  type="number"
                  placeholder="Deduction (₹)"
                  value={payDeduction}
                  onChange={(e) => setPayDeduction(e.target.value)}
                  className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
                />
                <button type="submit" className="col-span-2 min-h-[40px] rounded-xl bg-[#047857] text-white text-xs font-semibold">
                  Issue Salary Payout &amp; Log Expense
                </button>
              </form>
              <div className="space-y-2">
                {payroll.map((pr) => (
                  <div key={pr.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex justify-between text-xs">
                    <div>
                      <p className="font-bold">{pr.staffName} · {pr.month}</p>
                      <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                        Base {formatInr(pr.baseSalaryInr)} + {formatInr(pr.bonusInr)} - {formatInr(pr.deductionInr)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-[#047857] dark:text-[#34D399]">{formatInr(pr.netPaidInr)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
