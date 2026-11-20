import React, { useEffect, useState } from 'react';
import { Receipt, Wallet, AlertOctagon, Download, Bell, Trash2, Edit2, Plus } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  Expense,
  ExpenseCategory,
  OutstandingDue,
  Property,
  RentCharge,
  TenantStay,
} from '../../../packages/shared/types';
import { EXPENSE_CATEGORY_LABELS } from '../../../packages/shared/constants';

export function OwnerFinancePage({ defaultTab = 'rent' }: { defaultTab?: 'rent' | 'expenses' | 'dues' }) {
  const { showToast, confirmAction } = useToast();
  const [tab, setTab] = useState<'rent' | 'expenses' | 'dues'>(defaultTab);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stays, setStays] = useState<TenantStay[]>([]);
  const [rentCharges, setRentCharges] = useState<RentCharge[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [outstandingDues, setOutstandingDues] = useState<OutstandingDue[]>([]);
  const [metrics, setMetrics] = useState({
    rentCollectedInr: 0,
    pendingRentInr: 0,
    totalExpensesInr: 0,
    outstandingDuesInr: 0,
    netOperatingInr: 0,
  });

  // Property filter
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));

  // Payment modal state
  const [payModalCharge, setPayModalCharge] = useState<RentCharge | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payLateFee, setPayLateFee] = useState('0');
  const [payMode, setPayMode] = useState<'UPI' | 'BANK_TRANSFER' | 'CASH' | 'CARD'>('UPI');

  // Expense form + edit modal
  const [expPropId, setExpPropId] = useState('');
  const [expCat, setExpCat] = useState<ExpenseCategory>(ExpenseCategory.GROCERIES);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expNotes, setExpNotes] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Add Outstanding Due form
  const [duePropId, setDuePropId] = useState('');
  const [dueStayId, setDueStayId] = useState('');
  const [dueTenantName, setDueTenantName] = useState('');
  const [dueCategory, setDueCategory] = useState<'RENT' | 'ELECTRICITY' | 'DAMAGE' | 'LATE_FEE' | 'OTHER'>('ELECTRICITY');
  const [dueAmount, setDueAmount] = useState('');
  const [dueDesc, setDueDesc] = useState('');

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const loadFinance = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL');
      setProperties(res.properties || []);
      setStays(res.stays || []);
      setRentCharges(res.rentCharges || []);
      setExpenses(res.expenses || []);
      setOutstandingDues(res.outstandingDues || []);
      setMetrics(res.metrics);
      if (res.properties?.[0]) {
        if (!expPropId) setExpPropId(res.properties[0].id);
        if (!duePropId) setDuePropId(res.properties[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const handleGenerateMonth = async () => {
    try {
      const res = await apiFetch<{ createdCount: number; billingMonth: string }>(
        '/api/v1/operations/owner/rent/generate-month',
        {
          method: 'POST',
          body: JSON.stringify({ billingMonth, propertyId: propertyFilter }),
        }
      );
      showToast(`Generated ${res.createdCount} bill(s) for ${res.billingMonth}`);
      await loadFinance();
    } catch (err: any) {
      showToast('Generation failed', err.message, 'error');
    }
  };

  const openPaymentModal = (rc: RentCharge) => {
    const rem = Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr);
    setPayModalCharge(rc);
    setPayAmount(String(rem));
    setPayLateFee(String(rc.lateFeeInr || 0));
    setPayMode(rc.paymentMode || 'UPI');
  };

  const handleRecordPayment = async (e: React.FormEvent, waive = false) => {
    e.preventDefault();
    if (!payModalCharge) return;
    try {
      await apiFetch(`/api/v1/operations/owner/rent/${payModalCharge.id}/record-payment`, {
        method: 'POST',
        body: JSON.stringify(
          waive
            ? { waive: true }
            : { amountInr: Number(payAmount), lateFeeInr: Number(payLateFee), paymentMode: payMode }
        ),
      });
      setPayModalCharge(null);
      showToast(waive ? 'Rent Waived' : 'Payment Recorded & Receipt Issued');
      await loadFinance();
    } catch (err: any) {
      showToast('Payment update failed', err.message, 'error');
    }
  };

  const handleSendReminder = async (chargeId: string) => {
    try {
      await apiFetch(`/api/v1/operations/owner/rent/${chargeId}/remind`, { method: 'POST' });
      showToast('Payment reminder sent to tenant');
      await loadFinance();
    } catch (err: any) {
      showToast('Could not send reminder', err.message, 'error');
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await apiFetch(`/api/v1/operations/owner/expenses/${editingExpense.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            category: expCat,
            amountInr: Number(expAmount),
            date: expDate,
            notes: expNotes,
          }),
        });
        setEditingExpense(null);
        showToast('Expense updated');
      } else {
        await apiFetch('/api/v1/operations/owner/expenses', {
          method: 'POST',
          body: JSON.stringify({
            propertyId: expPropId,
            category: expCat,
            amountInr: Number(expAmount),
            date: expDate,
            notes: expNotes,
          }),
        });
        showToast('Expense logged');
      }
      setExpAmount('');
      setExpNotes('');
      await loadFinance();
    } catch (err: any) {
      showToast('Could not save expense', err.message, 'error');
    }
  };

  const handleDeleteExpense = async (ex: Expense) => {
    const ok = await confirmAction({
      title: `Delete expense (${formatInr(ex.amountInr)})?`,
      description: ex.notes,
      confirmLabel: 'Delete Expense',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/v1/operations/owner/expenses/${ex.id}`, { method: 'DELETE' });
      showToast('Expense deleted');
      await loadFinance();
    } catch (err: any) {
      showToast('Delete failed', err.message, 'error');
    }
  };

  const handleExportExpensesCsv = () => {
    const rows = [
      ['Date', 'Property', 'Category', 'Amount (INR)', 'Notes'],
      ...filteredExpenses.map((ex) => {
        const propName = properties.find((p) => p.id === ex.propertyId)?.name || ex.propertyId;
        return [ex.date, propName, ex.category, String(ex.amountInr), `"${ex.notes.replace(/"/g, '""')}"`];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pg-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Expenses CSV downloaded');
  };

  const handleAddDue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/operations/owner/dues', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: duePropId,
          stayId: dueStayId || undefined,
          tenantName: dueStayId ? undefined : dueTenantName || 'Resident',
          category: dueCategory,
          totalAmountInr: Number(dueAmount),
          description: dueDesc,
        }),
      });
      setDueAmount('');
      setDueDesc('');
      setDueTenantName('');
      showToast('Outstanding due added');
      await loadFinance();
    } catch (err: any) {
      showToast('Could not add due', err.message, 'error');
    }
  };

  const handleSettleDue = async (due: OutstandingDue, partial = false) => {
    const remaining = Math.max(0, due.totalAmountInr - due.paidAmountInr);
    const amount = partial ? Math.max(1, Math.round(remaining / 2)) : remaining;
    try {
      await apiFetch(`/api/v1/operations/owner/dues/${due.id}/payment`, {
        method: 'POST',
        body: JSON.stringify({ amountInr: amount }),
      });
      showToast(partial ? 'Partial payment recorded' : 'Due marked settled');
      await loadFinance();
    } catch (err: any) {
      showToast('Settlement failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  const filteredRent = rentCharges.filter((r) => propertyFilter === 'ALL' || r.propertyId === propertyFilter);
  const filteredExpenses = expenses.filter((e) => propertyFilter === 'ALL' || e.propertyId === propertyFilter);
  const filteredDues = outstandingDues.filter((d) => propertyFilter === 'ALL' || d.propertyId === propertyFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            Finance, Rent, Expenses &amp; Dues
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Generate monthly rent, collect partial/full payments with receipts, manage expenses, and track former-tenant dues.
          </p>
        </div>

        <select
          aria-label="Filter finance by property"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="min-h-[42px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-sm font-medium text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="ALL">All Properties ({properties.length})</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Rent Collected</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
            {formatInr(metrics.rentCollectedInr)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Pending Rent</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#B45309] dark:text-amber-400 tabular-nums">
            {formatInr(metrics.pendingRentInr)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Expenses</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
            {formatInr(metrics.totalExpensesInr)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Outstanding Dues</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#DC2626] dark:text-red-400 tabular-nums">
            {formatInr(metrics.outstandingDuesInr)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4">
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Net Operating</p>
          <p className="mt-1 font-mono text-xl font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
            {formatInr(metrics.netOperatingInr)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827]">
        {[
          { id: 'rent', label: 'Rent & Payments', icon: Receipt },
          { id: 'expenses', label: 'Expenses', icon: Wallet },
          { id: 'dues', label: 'Outstanding Dues', icon: AlertOctagon },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`min-h-[38px] px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                tab === t.id
                  ? 'bg-[#047857] text-white'
                  : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Rent & Payments */}
      {tab === 'rent' && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Monthly Rent Ledger</h2>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs"
              />
              <button
                type="button"
                onClick={handleGenerateMonth}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Generate Monthly Rent
              </button>
            </div>
          </div>

          {filteredRent.length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No rent charges recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {filteredRent.map((rc) => {
                const prop = properties.find((p) => p.id === rc.propertyId);
                const stay = stays.find((s) => s.id === rc.stayId);
                const totalDue = rc.amountInr + (rc.lateFeeInr || 0);
                const remaining = Math.max(0, totalDue - rc.paidAmountInr);
                return (
                  <div
                    key={rc.id}
                    className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {stay?.tenantName || 'Resident'} · {prop?.name} · {rc.billingMonth}
                        {rc.receiptNumber ? ` · ${rc.receiptNumber}` : ''}
                      </p>
                      <p className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                        {formatInr(rc.paidAmountInr)} / {formatInr(totalDue)}
                        {rc.lateFeeInr ? ` (incl. ₹${rc.lateFeeInr} late fee)` : ''}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <StatusIndicator
                          status={rc.status === 'PAID' || rc.status === 'WAIVED' ? 'success' : 'warning'}
                          label={rc.status}
                        />
                        {rc.paymentMode && (
                          <span className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{rc.paymentMode}</span>
                        )}
                      </div>
                    </div>

                    {remaining > 0 && rc.status !== 'WAIVED' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openPaymentModal(rc)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold"
                        >
                          Record / Waive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendReminder(rc.id)}
                          className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          Remind
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Expenses */}
      {tab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveExpense}
            className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3 self-start"
          >
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              {editingExpense ? 'Edit Expense' : 'Log Property Expense'}
            </h2>
            <select
              value={expPropId}
              onChange={(e) => setExpPropId(e.target.value)}
              disabled={Boolean(editingExpense)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={expCat}
                onChange={(e) => setExpCat(e.target.value as ExpenseCategory)}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              >
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                placeholder="Amount (₹)"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                required
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <input
              type="text"
              placeholder="Expense notes (vendor, bill #, description)"
              value={expNotes}
              onChange={(e) => setExpNotes(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
                {editingExpense ? 'Save Changes' : 'Save Expense'}
              </button>
              {editingExpense && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setExpAmount('');
                    setExpNotes('');
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm font-semibold"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                Expense Ledger ({filteredExpenses.length})
              </h2>
              <button
                type="button"
                onClick={handleExportExpensesCsv}
                className="min-h-[36px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
            {filteredExpenses.map((ex) => {
              const prop = properties.find((p) => p.id === ex.propertyId);
              return (
                <div
                  key={ex.id}
                  className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
                      {EXPENSE_CATEGORY_LABELS[ex.category]} · {prop?.name}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {ex.date} · {ex.notes}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">
                      {formatInr(ex.amountInr)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExpense(ex);
                        setExpPropId(ex.propertyId);
                        setExpCat(ex.category);
                        setExpAmount(String(ex.amountInr));
                        setExpDate(ex.date);
                        setExpNotes(ex.notes);
                      }}
                      aria-label="Edit expense"
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F9FAFB]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(ex)}
                      aria-label="Delete expense"
                      className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#DC2626] dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Outstanding Dues (Active & Former Tenants) */}
      {tab === 'dues' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddDue}
            className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3 self-start"
          >
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Add Outstanding Due</h2>
            <select
              value={duePropId}
              onChange={(e) => setDuePropId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={dueStayId}
              onChange={(e) => setDueStayId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            >
              <option value="">Custom / Manual Tenant Name</option>
              {stays
                .filter((s) => s.propertyId === duePropId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.tenantName} ({s.status.replace(/_/g, ' ')})
                  </option>
                ))}
            </select>
            {!dueStayId && (
              <input
                type="text"
                placeholder="Tenant full name"
                value={dueTenantName}
                onChange={(e) => setDueTenantName(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <select
                value={dueCategory}
                onChange={(e) => setDueCategory(e.target.value as any)}
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
              >
                <option value="ELECTRICITY">Electricity</option>
                <option value="RENT">Rent</option>
                <option value="DAMAGE">Damage</option>
                <option value="LATE_FEE">Late Fee</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                type="number"
                min={1}
                placeholder="Amount (₹)"
                value={dueAmount}
                onChange={(e) => setDueAmount(e.target.value)}
                required
                className="min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
            <input
              type="text"
              placeholder="Description (e.g. AC meter reading balance)"
              value={dueDesc}
              onChange={(e) => setDueDesc(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-sm"
            />
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Record Due
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              Active &amp; Former Tenant Dues ({filteredDues.length})
            </h2>
            {filteredDues.length === 0 ? (
              <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No outstanding dues.</p>
            ) : (
              filteredDues.map((d) => {
                const rem = Math.max(0, d.totalAmountInr - d.paidAmountInr);
                return (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
                        {d.tenantName} {d.isFormerTenant ? '(Former Tenant)' : '(Active)'} · {d.category}
                      </p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{d.description}</p>
                      <p className="mt-1 font-mono text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                        Paid {formatInr(d.paidAmountInr)} / {formatInr(d.totalAmountInr)} · Remaining {formatInr(rem)}
                      </p>
                      <StatusIndicator
                        status={d.status === 'SETTLED' ? 'success' : d.status === 'PARTIAL' ? 'info' : 'warning'}
                        label={d.status}
                      />
                    </div>
                    {d.status !== 'SETTLED' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSettleDue(d, true)}
                          className="min-h-[36px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold"
                        >
                          50% Partial
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSettleDue(d, false)}
                          className="min-h-[36px] px-3 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                        >
                          Settle Full
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Payment / Waive / Late Fee Modal */}
      <BottomSheet
        open={Boolean(payModalCharge)}
        onClose={() => setPayModalCharge(null)}
        title={`Record Payment (${payModalCharge?.billingMonth || ''})`}
      >
        <form onSubmit={(e) => handleRecordPayment(e, false)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Amount (₹)</label>
              <input
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Late Fee (₹)</label>
              <input
                type="number"
                min={0}
                value={payLateFee}
                onChange={(e) => setPayLateFee(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Payment Mode</label>
            <select
              value={payMode}
              onChange={(e) => setPayMode(e.target.value as any)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
            >
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
              Record Payment &amp; Issue Receipt
            </button>
            <button
              type="button"
              onClick={(e) => handleRecordPayment(e, true)}
              className="min-h-[44px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-sm font-semibold text-[#B45309] dark:text-amber-400"
            >
              Waive Rent
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
