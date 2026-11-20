import React, { useEffect, useState } from 'react';
import { Download, Lock, Plus } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { invalidateAdMobCache } from '../../components/ui/AdSlot';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';
import { AdMobSettings, LocalBusinessListing } from '../../../packages/shared/types';
import { BUSINESS_AD_PACKAGES, INDIAN_CITIES } from '../../../packages/shared/constants';

const LOCAL_CATEGORIES: LocalBusinessListing['category'][] = [
  'Affordable Food',
  'Groceries',
  'Laundry',
  'Fitness',
  'Local Services',
  'Transportation',
  'Daily Essentials',
  'Nearby Deals',
];

export function AdminMonetizationPage({
  section,
}: {
  section: 'subscriptions' | 'lifetime' | 'payments' | 'promotions' | 'ads' | 'admob' | 'all';
}) {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [localAds, setLocalAds] = useState<LocalBusinessListing[]>([]);
  const [admob, setAdmob] = useState<AdMobSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [txnFilter, setTxnFilter] = useState('ALL');

  // Create Local Ad Form
  const [adName, setAdName] = useState('');
  const [adCategory, setAdCategory] = useState<LocalBusinessListing['category']>('Affordable Food');
  const [adTitle, setAdTitle] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adCity, setAdCity] = useState(INDIAN_CITIES[0]);
  const [adLocality, setAdLocality] = useState('');
  const [adOffer, setAdOffer] = useState('');
  const [adPkg, setAdPkg] = useState(BUSINESS_AD_PACKAGES[1].label);
  const [adSponsored, setAdSponsored] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ov, adCfg, biz] = await Promise.all([
        apiFetch('/api/v1/admin/overview'),
        apiFetch<{ settings: AdMobSettings }>('/api/v1/monetization/admob/config'),
        apiFetch<{ businesses: LocalBusinessListing[] }>('/api/v1/monetization/local-businesses?includeAll=true'),
      ]);
      setData(ov);
      setAdmob(adCfg.settings);
      setLocalAds(biz.businesses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [section]);

  const exportTransactionsCsv = () => {
    if (!data?.transactions) return;
    const rows = [
      ['ID', 'Type', 'Amount INR', 'Provider', 'Status', 'Description', 'Created At'],
      ...data.transactions.map((t: any) => [
        t.id,
        t.type,
        String(t.amountInr),
        t.provider,
        t.status,
        `"${String(t.description || '').replace(/"/g, '""')}"`,
        t.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pgfinder-platform-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAdMob = async (next: AdMobSettings) => {
    try {
      const res = await apiFetch<{ settings: AdMobSettings }>('/api/v1/monetization/admin/admob/config', {
        method: 'POST',
        body: JSON.stringify(next),
      });
      setAdmob(res.settings);
      invalidateAdMobCache();
      showToast('AdMob Configuration Saved', 'Placement & unit settings updated cleanly');
    } catch (err: any) {
      showToast('Save failed', err.message, 'error');
    }
  };

  const handleCreateLocalAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/monetization/admin/local-businesses', {
        method: 'POST',
        body: JSON.stringify({
          name: adName,
          category: adCategory,
          title: adTitle,
          description: adDesc,
          city: adCity,
          locality: adLocality,
          offerText: adOffer,
          isSponsored: adSponsored,
          packageLabel: adPkg,
          status: 'ACTIVE',
        }),
      });
      setAdName('');
      setAdTitle('');
      setAdDesc('');
      setAdLocality('');
      setAdOffer('');
      showToast('Local Business Ad Created');
      await loadAll();
    } catch (err: any) {
      showToast('Could not create ad', err.message, 'error');
    }
  };

  if (loading || !data) return <CardSkeleton rows={3} />;

  const inputClass =
    'w-full min-h-[42px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-sm text-[#111827] dark:text-[#F9FAFB]';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
          {section === 'subscriptions'
            ? 'Owner Subscriptions'
            : section === 'lifetime'
              ? '₹199 Lifetime PG Listings'
              : section === 'payments'
                ? 'Platform Billing Transactions'
                : section === 'promotions'
                  ? 'Featured PG Promotions'
                  : section === 'ads'
                    ? 'PG Finder Local Business Ads'
                    : section === 'admob'
                      ? 'Google AdMob Configuration'
                      : 'Monetization & Ads'}
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Platform billing, listing entitlements, hyperlocal sponsorships, and Capacitor AdMob configuration. Strictly separate from owner PG rent ledgers.
        </p>
      </div>

      {section === 'subscriptions' && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#374151] text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                <th className="p-4 font-semibold">PG Owner</th>
                <th className="p-4 font-semibold">Tier</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Max Covered PGs</th>
                <th className="p-4 font-semibold">Renewal Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151] text-sm">
              {data.subscriptions.map((sub: any) => (
                <tr key={sub.ownerId} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/60">
                  <td className="p-4">
                    <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{sub.ownerName}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{sub.ownerEmail}</p>
                  </td>
                  <td className="p-4 font-semibold text-[#047857] dark:text-[#34D399]">{sub.tier}</td>
                  <td className="p-4">
                    <StatusIndicator
                      status={sub.status === 'ACTIVE' ? 'success' : 'warning'}
                      label={sub.status}
                    />
                  </td>
                  <td className="p-4 font-mono tabular-nums text-[#111827] dark:text-[#F9FAFB]">{sub.maxListings}</td>
                  <td className="p-4 text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">{sub.renewalDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {section === 'lifetime' && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#374151] text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                <th className="p-4 font-semibold">Property</th>
                <th className="p-4 font-semibold">Owner</th>
                <th className="p-4 font-semibold">₹199 Lifetime Right</th>
                <th className="p-4 font-semibold">Subscription Covered</th>
                <th className="p-4 font-semibold">Approval / Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#374151] text-sm">
              {data.properties.map((p: any) => (
                <tr key={p.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/60">
                  <td className="p-4">
                    <p className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{p.name}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">{p.locality}, {p.city}</p>
                  </td>
                  <td className="p-4 text-xs text-[#4B5563] dark:text-[#D1D5DB]">{p.ownerName}</td>
                  <td className="p-4">
                    <StatusIndicator
                      status={p.hasLifetimeListing ? 'success' : 'neutral'}
                      label={p.hasLifetimeListing ? 'Lifetime Active' : 'Not Purchased'}
                    />
                  </td>
                  <td className="p-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {p.coveredBySubscription ? 'Yes (Pro/Business)' : 'No'}
                  </td>
                  <td className="p-4 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {p.approvalStatus} · {p.locationStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(section === 'payments' || section === 'all') && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              Platform Payment Transactions ({data.transactions.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={txnFilter}
                onChange={(e) => setTxnFilter(e.target.value)}
                className="min-h-[38px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] text-xs text-[#111827] dark:text-[#F9FAFB]"
              >
                <option value="ALL">All Types</option>
                <option value="SUBSCRIPTION">Subscription</option>
                <option value="LIFETIME_LISTING">Lifetime Listing (₹199)</option>
                <option value="FEATURED_PROMOTION">Featured Promotion</option>
                <option value="BUSINESS_AD">Local Business Ad</option>
              </select>
              <button
                type="button"
                onClick={exportTransactionsCsv}
                className="min-h-[38px] px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {data.transactions
              .filter((t: any) => (txnFilter === 'ALL' ? true : t.type === txnFilter))
              .map((txn: any) => (
                <div
                  key={txn.id}
                  className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">{txn.description}</p>
                    <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      {txn.type} · Status: {txn.status} · {new Date(txn.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[#047857] dark:text-[#34D399] tabular-nums">
                      {formatInr(txn.amountInr)}
                    </span>
                    {txn.status === 'SUCCEEDED' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/v1/monetization/admin/transactions/${txn.id}/refund`, {
                            method: 'POST',
                          });
                          showToast('Transaction Marked Refunded');
                          await loadAll();
                        }}
                        className="min-h-[34px] px-3 rounded-lg border border-red-200 dark:border-red-900/50 text-xs font-semibold text-[#DC2626] dark:text-red-400"
                      >
                        Mark Refunded
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {section === 'promotions' && (
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Featured PG Listings</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Featured boosts rank approved &amp; verified PGs higher in search results and never bypass compliance.
          </p>
          <div className="space-y-2.5">
            {data.properties.map((p: any) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{p.name}</p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {p.locality}, {p.city} · Owner: {p.ownerName}
                    {p.promotionEndsAt ? ` · Ends ${new Date(p.promotionEndsAt).toLocaleDateString('en-IN')}` : ''}
                  </p>
                </div>
                <StatusIndicator
                  status={p.isPromoted ? 'success' : 'neutral'}
                  label={p.isPromoted ? 'Featured Active' : 'Standard'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {(section === 'ads' || section === 'all') && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateLocalAd}
            className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4"
          >
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
              Add Local Business Ad
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Business Name" value={adName} onChange={(e) => setAdName(e.target.value)} required className={inputClass} />
              <select
                value={adCategory}
                onChange={(e) => setAdCategory(e.target.value as LocalBusinessListing['category'])}
                className={inputClass}
              >
                {LOCAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={adCity} onChange={(e) => setAdCity(e.target.value)} className={inputClass}>
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input type="text" placeholder="Locality (e.g., Madhapur)" value={adLocality} onChange={(e) => setAdLocality(e.target.value)} required className={inputClass} />
              <input type="text" placeholder="Campaign Title" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} required className={inputClass} />
              <input type="text" placeholder="Offer Badge (e.g., 15% Off First Month)" value={adOffer} onChange={(e) => setAdOffer(e.target.value)} required className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Description (min 8 chars)"
                value={adDesc}
                onChange={(e) => setAdDesc(e.target.value)}
                required
                className={`sm:col-span-2 ${inputClass}`}
              />
              <select value={adPkg} onChange={(e) => setAdPkg(e.target.value)} className={inputClass}>
                {BUSINESS_AD_PACKAGES.map((pk) => (
                  <option key={pk.id} value={pk.label}>{pk.label} ({formatInr(pk.priceInr)})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#111827] dark:text-[#F9FAFB]">
                <input type="checkbox" checked={adSponsored} onChange={(e) => setAdSponsored(e.target.checked)} />
                Mark as Sponsored Placement
              </label>
              <button type="submit" className="min-h-[42px] px-5 rounded-xl bg-[#047857] text-white text-xs font-semibold">
                Publish Local Ad
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
            <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              Local Business Listings &amp; Sponsored Ads ({localAds.length})
            </h2>
            {localAds.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                    {b.name} {b.isSponsored ? '· Sponsored' : ''} · {b.status || 'ACTIVE'}
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                    {b.category} · {b.locality}, {b.city} · {b.title} · Offer: {b.offerText}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-right font-mono text-xs tabular-nums mr-2">
                    <p className="text-[#111827] dark:text-[#F9FAFB]">{b.impressions} views</p>
                    <p className="text-[#047857] dark:text-[#34D399] font-bold">{b.clicks} clicks</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextStatus = (b.status || 'ACTIVE') === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
                      await apiFetch(`/api/v1/monetization/admin/local-businesses/${b.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: nextStatus }),
                      });
                      showToast(`Local Ad ${nextStatus}`);
                      await loadAll();
                    }}
                    className="min-h-[36px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]"
                  >
                    {(b.status || 'ACTIVE') === 'ACTIVE' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/v1/monetization/admin/local-businesses/${b.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isSponsored: !b.isSponsored }),
                      });
                      showToast(b.isSponsored ? 'Removed Sponsored Flag' : 'Marked Sponsored');
                      await loadAll();
                    }}
                    className="min-h-[36px] px-3 rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#047857] dark:text-[#34D399]"
                  >
                    {b.isSponsored ? 'Un-sponsor' : 'Sponsor'}
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {section === 'admob' && admob && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                  Capacitor Google AdMob Configuration
                </h2>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  Official AdMob Reporting API Not Connected — Integration &amp; Placement Status Only. No fabricated revenue estimates.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857] dark:text-[#34D399]">
                <Lock className="w-3.5 h-3.5" />
                Ad-Free Checkout, Rent &amp; KYC Locked
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { key: 'enabled', label: 'AdMob Master Switch' },
                { key: 'bannerEnabled', label: 'Banner Ads (Explore & Home Discovery)' },
                { key: 'nativeEnabled', label: 'Native Cards (Local & Events Feeds)' },
                { key: 'interstitialEnabled', label: 'Interstitial Ads (Natural Transitions Only)' },
                { key: 'rewardedEnabled', label: 'Optional Rewarded Ads' },
                { key: 'childDirectedTreatment', label: 'Child-Directed / COPPA Safe Mode' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-[#111827] dark:text-[#F9FAFB]"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean((admob as any)[item.key])}
                    onChange={(e) => setAdmob({ ...admob, [item.key]: e.target.checked })}
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Environment Mode</label>
                <select
                  value={admob.environment}
                  onChange={(e) => setAdmob({ ...admob, environment: e.target.value as 'test' | 'production' })}
                  className={inputClass}
                >
                  <option value="test">Test Mode (Google Sample Ad Units)</option>
                  <option value="production">Production Mode (Live Unit IDs)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Daily Interstitial Frequency Cap (0–10)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={admob.dailyInterstitialCap}
                  onChange={(e) => setAdmob({ ...admob, dailyInterstitialCap: Number(e.target.value) })}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'appId', label: 'AdMob App ID' },
                { key: 'bannerUnitId', label: 'Banner Unit ID' },
                { key: 'nativeUnitId', label: 'Native Unit ID' },
                { key: 'interstitialUnitId', label: 'Interstitial Unit ID' },
                { key: 'rewardedUnitId', label: 'Rewarded Unit ID' },
                { key: 'appOpenUnitId', label: 'App Open Unit ID' },
              ].map((u) => (
                <div key={u.key}>
                  <label className="block text-xs font-semibold mb-1">{u.label}</label>
                  <input
                    type="text"
                    value={(admob as any)[u.key] || ''}
                    onChange={(e) => setAdmob({ ...admob, [u.key]: e.target.value })}
                    placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                    className={`${inputClass} font-mono text-xs`}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSaveAdMob(admob)}
              className="min-h-[44px] px-5 rounded-xl bg-[#047857] text-white text-sm font-semibold"
            >
              Save AdMob Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
