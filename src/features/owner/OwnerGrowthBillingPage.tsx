import React, { useEffect, useState } from 'react';
import { Check, CreditCard, Sparkles } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import {
  LocationVerificationStatus,
  OwnerSubscription,
  PaymentTransaction,
  Property,
  PropertyApprovalStatus,
  SubscriptionTier,
} from '../../../packages/shared/types';
import { PROMOTION_PACKAGES, SUBSCRIPTION_PLANS } from '../../../packages/shared/constants';

export function OwnerGrowthBillingPage({ mode }: { mode: 'subscriptions' | 'promotions' }) {
  const { showToast, confirmAction } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [promoPkgMap, setPromoPkgMap] = useState<Record<string, string>>({});

  const loadBilling = async () => {
    setLoading(true);
    try {
      const bill = await apiFetch<{
        subscription: OwnerSubscription;
        transactions: PaymentTransaction[];
        properties: Property[];
      }>('/api/v1/monetization/owner/billing');
      setSubscription(bill.subscription);
      setTransactions(bill.transactions || []);
      setProperties(bill.properties || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    const plan = SUBSCRIPTION_PLANS[tier];
    const ok = await confirmAction({
      title: `Switch to ${plan.name} Plan?`,
      description:
        tier === SubscriptionTier.BASIC
          ? 'Downgrading to Basic preserves all purchased ₹199 lifetime listings and operational records.'
          : `Activate ${plan.name} at ${formatInr(plan.monthlyPriceInr)}/month covering up to ${plan.maxActiveListings} listings.`,
      confirmLabel: `Activate ${plan.name}`,
    });
    if (!ok) return;
    try {
      await apiFetch('/api/v1/monetization/owner/subscribe', {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
      showToast(`Subscribed to ${plan.name}`);
      await loadBilling();
    } catch (err: any) {
      showToast('Plan update failed', err.message, 'error');
    }
  };

  const handleBuyLifetime = async (prop: Property) => {
    try {
      await apiFetch(`/api/v1/monetization/owner/lifetime-listing/${prop.id}`, { method: 'POST' });
      showToast('Lifetime Listing Activated', `${prop.name} is now permanently covered.`);
      await loadBilling();
    } catch (err: any) {
      showToast('Activation blocked', err.message, 'error');
    }
  };

  const handlePromote = async (prop: Property) => {
    const packageId = promoPkgMap[prop.id] || PROMOTION_PACKAGES[0].id;
    try {
      await apiFetch(`/api/v1/monetization/owner/promote/${prop.id}`, {
        method: 'POST',
        body: JSON.stringify({ packageId }),
      });
      showToast('Promotion Activated', `${prop.name} is now featured in search results.`);
      await loadBilling();
    } catch (err: any) {
      showToast('Promotion blocked', err.message, 'error');
    }
  };

  if (loading) return <CardSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        {mode === 'subscriptions' ? (
          <CreditCard className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
        ) : (
          <Sparkles className="w-6 h-6 text-[#047857] dark:text-[#34D399]" />
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            {mode === 'subscriptions' ? 'Subscriptions & Listing Billing' : 'Featured PG Promotions'}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            {mode === 'subscriptions'
              ? 'Manage Basic, Pro, and Business plans, ₹199 one-time lifetime listings, and billing invoices.'
              : 'Boost approved and location-verified properties in PG discovery results without bypassing compliance.'}
          </p>
        </div>
      </div>

      {mode === 'subscriptions' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
              const isCurrent = subscription?.tier === plan.tier;
              return (
                <div
                  key={plan.tier}
                  className={`rounded-2xl border p-5 flex flex-col justify-between ${
                    isCurrent
                      ? 'border-[#047857] dark:border-[#34D399] bg-[#ECFDF5]/60 dark:bg-[#10B981]/10'
                      : 'border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-bold">{plan.name}</h2>
                      {isCurrent && <StatusIndicator status="success" label="Current Plan" />}
                    </div>
                    <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">{plan.audience}</p>
                    <p className="mt-3 font-mono text-2xl font-bold tabular-nums">
                      {formatInr(plan.monthlyPriceInr)}
                      <span className="text-xs font-sans text-[#6B7280] dark:text-[#9CA3AF]">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleSelectPlan(plan.tier)}
                    className={`mt-6 min-h-[44px] w-full rounded-xl text-xs font-semibold ${
                      isCurrent
                        ? 'bg-[#E5E7EB] dark:bg-[#1F2937] text-[#6B7280] dark:text-[#9CA3AF] cursor-default'
                        : 'bg-[#047857] hover:bg-[#065F46] text-white'
                    }`}
                  >
                    {isCurrent ? 'Active Plan' : `Switch to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Per-property Lifetime Listing Activation */}
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold">₹199 One-Time Lifetime Listing Rights</h2>
            {properties.map((p) => {
              const eligible =
                !p.hasLifetimeListing &&
                p.approvalStatus === PropertyApprovalStatus.APPROVED &&
                p.locationStatus === LocationVerificationStatus.VERIFIED;
              return (
                <div key={p.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {p.hasLifetimeListing
                        ? 'Lifetime Listing Active (Preserved across plan changes)'
                        : p.coveredBySubscription
                          ? 'Covered by active subscription'
                          : 'Requires subscription or ₹199 lifetime activation'}
                    </p>
                  </div>
                  {p.hasLifetimeListing ? (
                    <StatusIndicator status="success" label="Lifetime Active" />
                  ) : (
                    <button
                      type="button"
                      disabled={!eligible}
                      onClick={() => handleBuyLifetime(p)}
                      className="min-h-[38px] px-4 rounded-xl bg-[#047857] disabled:opacity-40 text-white text-xs font-semibold"
                    >
                      {eligible ? 'Buy ₹199 Lifetime' : 'Requires Approval & Verification'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
          <h2 className="text-base font-bold">Promote Approved Properties</h2>
          {properties.map((p) => {
            const eligible =
              p.approvalStatus === PropertyApprovalStatus.APPROVED &&
              p.locationStatus === LocationVerificationStatus.VERIFIED;
            return (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {p.isPromoted
                      ? `Featured until ${p.promotionEndsAt ? new Date(p.promotionEndsAt).toLocaleDateString('en-IN') : 'Active'}`
                      : eligible
                        ? 'Eligible for Featured PG spotlight'
                        : 'Property must be Approved & Location Verified before promotion'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={promoPkgMap[p.id] || PROMOTION_PACKAGES[0].id}
                    onChange={(e) => setPromoPkgMap({ ...promoPkgMap, [p.id]: e.target.value })}
                    className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs"
                  >
                    {PROMOTION_PACKAGES.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.label} — {formatInr(pkg.priceInr)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!eligible}
                    onClick={() => handlePromote(p)}
                    className="min-h-[38px] px-4 rounded-xl bg-[#047857] disabled:opacity-40 text-white text-xs font-semibold"
                  >
                    Activate Boost
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoices */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
        <h2 className="text-base font-bold">Billing &amp; Payment History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No transactions recorded yet.</p>
        ) : (
          transactions.map((txn) => (
            <div key={txn.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-sm">{txn.description}</p>
                <p className="text-[#6B7280] dark:text-[#9CA3AF]">
                  {new Date(txn.createdAt).toLocaleDateString('en-IN')} · {txn.type}
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-[#047857] dark:text-[#34D399]">{formatInr(txn.amountInr)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
