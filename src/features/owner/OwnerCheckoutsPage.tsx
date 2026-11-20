import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BottomSheet, CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { Bed, Property, RentCharge, StayStatus, TenantStay } from '../../../packages/shared/types';

export function OwnerCheckoutsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stays, setStays] = useState<TenantStay[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [rentCharges, setRentCharges] = useState<RentCharge[]>([]);

  const [checkoutTarget, setCheckoutTarget] = useState<TenantStay | null>(null);
  const [deductionInr, setDeductionInr] = useState('0');
  const [deductionReason, setDeductionReason] = useState('Room painting & cleaning adjustment');

  const loadData = async () => {
    setLoading(true);
    try {
      const ov = await apiFetch<any>('/api/v1/operations/owner/overview?propertyId=ALL');
      setStays(ov.stays || []);
      setProperties(ov.properties || []);
      setBeds(ov.beds || []);
      setRentCharges(ov.rentCharges || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTarget) return;
    try {
      const res = await apiFetch<any>(`/api/v1/operations/owner/stays/${checkoutTarget.id}/finalize-checkout`, {
        method: 'POST',
        body: JSON.stringify({
          deductionInr: Number(deductionInr || 0),
          deductionReason,
        }),
      });
      setCheckoutTarget(null);
      showToast(
        'Checkout Finalized',
        `Bed released. Refund: ${formatInr(res.refundBalance || 0)} · Unpaid dues carried forward: ${formatInr(res.remainingUnpaidDebt || 0)}`
      );
      await loadData();
    } catch (err: any) {
      showToast('Checkout failed', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  const requested = stays.filter((s) => s.status === StayStatus.CHECKOUT_REQUESTED);
  const active = stays.filter((s) => s.status === StayStatus.ACTIVE);
  const completed = stays.filter((s) => s.status === StayStatus.CHECKED_OUT);

  const unpaidForStay = (stayId: string) =>
    rentCharges
      .filter((rc) => rc.stayId === stayId && rc.status !== 'PAID' && rc.status !== 'WAIVED')
      .reduce((acc, rc) => acc + Math.max(0, rc.amountInr + (rc.lateFeeInr || 0) - rc.paidAmountInr), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <LogOut className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">Checkout Management</h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Settle security deposits, carry forward unpaid balances as Outstanding Dues, and release beds safely.
          </p>
        </div>
      </div>

      {/* Pending Checkout Requests */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
          Checkout Requests Awaiting Settlement ({requested.length})
        </h2>
        {requested.length === 0 ? (
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No pending resident checkout requests.</p>
        ) : (
          requested.map((st) => {
            const prop = properties.find((p) => p.id === st.propertyId);
            const bed = beds.find((b) => b.id === st.bedId);
            const unpaid = unpaidForStay(st.id);
            return (
              <div
                key={st.id}
                className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <StatusIndicator status="warning" label="CHECKOUT REQUESTED" />
                  <Link to={`/owner/tenants/${st.id}`} className="mt-1 block text-sm font-bold hover:underline">
                    {st.tenantName}
                  </Link>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {prop?.name} · Bed {bed?.bedCode} · Deposit {formatInr(st.securityDepositInr)} · Unpaid Rent {formatInr(unpaid)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutTarget(st);
                    setDeductionInr('0');
                  }}
                  className="min-h-[40px] px-4 rounded-xl bg-[#047857] text-white text-xs font-semibold"
                >
                  Review Settlement &amp; Finalize
                </button>
              </div>
            );
          })
        )}
      </section>

      {/* Active Stays (Early / Owner-Initiated Checkout) */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Active Stays ({active.length})</h2>
        <div className="space-y-2.5">
          {active.map((st) => {
            const prop = properties.find((p) => p.id === st.propertyId);
            const bed = beds.find((b) => b.id === st.bedId);
            return (
              <div
                key={st.id}
                className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold">{st.tenantName}</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {prop?.name} · Bed {bed?.bedCode} · Unpaid Rent: {formatInr(unpaidForStay(st.id))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutTarget(st);
                    setDeductionInr('0');
                  }}
                  className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold hover:border-[#047857]"
                >
                  Initiate Checkout
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Completed Checkout History */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
          Completed Checkouts ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No finalized checkouts yet.</p>
        ) : (
          completed.map((st) => {
            const prop = properties.find((p) => p.id === st.propertyId);
            return (
              <div
                key={st.id}
                className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex justify-between items-center text-xs"
              >
                <div>
                  <Link to={`/owner/tenants/${st.id}`} className="text-sm font-bold hover:underline">
                    {st.tenantName}
                  </Link>
                  <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                    {prop?.name} · Checked out {st.checkedOutAt ? new Date(st.checkedOutAt).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
                <StatusIndicator status="neutral" label="CHECKED OUT" />
              </div>
            );
          })
        )}
      </section>

      {/* Finalize Checkout Settlement Modal */}
      <BottomSheet
        open={Boolean(checkoutTarget)}
        onClose={() => setCheckoutTarget(null)}
        title={`Checkout Settlement: ${checkoutTarget?.tenantName || ''}`}
      >
        {checkoutTarget && (() => {
          const unpaid = unpaidForStay(checkoutTarget.id);
          const deposit = checkoutTarget.depositPaid ? checkoutTarget.securityDepositInr : 0;
          const ded = Math.max(0, Number(deductionInr || 0));
          const liability = unpaid + ded;
          const refund = Math.max(0, deposit - liability);
          const carriedDue = Math.max(0, liability - deposit);
          return (
            <form onSubmit={handleConfirmCheckout} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Deposit Held</span>
                  <span className="font-mono font-bold">{formatInr(deposit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">Unpaid Rent</span>
                  <span className="font-mono font-bold text-[#B45309] dark:text-amber-400">{formatInr(unpaid)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E7EB] dark:border-[#374151]">
                  <span className="font-semibold">Estimated Refund to Tenant</span>
                  <span className="font-mono font-bold text-[#047857] dark:text-[#34D399]">{formatInr(refund)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Carried Forward as Former-Tenant Due</span>
                  <span className="font-mono font-bold text-[#DC2626] dark:text-red-400">{formatInr(carriedDue)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Deductions (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={deductionInr}
                  onChange={(e) => setDeductionInr(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Deduction Reason</label>
                <input
                  type="text"
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm"
                />
              </div>
              <button type="submit" className="w-full min-h-[44px] rounded-xl bg-[#047857] text-white text-sm font-semibold">
                Finalize Checkout &amp; Release Bed
              </button>
            </form>
          );
        })()}
      </BottomSheet>
    </div>
  );
}
