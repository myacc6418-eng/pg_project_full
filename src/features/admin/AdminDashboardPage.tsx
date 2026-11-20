import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  ShieldCheck,
  MapPin,
  CalendarDays,
  Users,
  Building2,
  BedDouble,
  CreditCard,
  Award,
  Megaphone,
  LifeBuoy,
  Wallet,
  Banknote,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { CardSkeleton, formatInr, StatusIndicator } from '../../components/ui/CommonUI';

export function AdminDashboardPage({ mode = 'dashboard' }: { mode?: 'dashboard' | 'analytics' }) {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/v1/admin/overview')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <CardSkeleton rows={4} />;

  const m = data.metrics;
  const revenueData = [
    { name: 'Subscriptions', amount: m.subscriptionRevenueInr },
    { name: 'Lifetime Fees', amount: m.lifetimeListingRevenueInr },
    { name: 'Promotions', amount: m.promotionRevenueInr },
    { name: 'Business Ads', amount: m.advertisingRevenueInr },
  ];

  const bedMixData = [
    { name: 'Occupied', count: m.occupiedBeds },
    { name: 'Available', count: m.availableBeds },
    { name: 'Reserved', count: m.reservedBeds },
    { name: 'Maintenance', count: m.maintenanceBeds },
  ];

  const isDark = resolvedTheme === 'dark';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#374151' : '#E5E7EB';

  const kpiCards = [
    {
      title: 'PG Owners',
      value: m.totalOwners,
      sub: 'Registered accounts',
      to: '/admin/owners',
      icon: Users,
    },
    {
      title: 'Published PGs',
      value: m.publishedProperties,
      sub: `${m.approvedProperties} approved · ${m.totalProperties} total`,
      to: '/admin/properties',
      icon: Building2,
    },
    {
      title: 'Pending Approvals',
      value: m.pendingApprovals,
      sub: 'Property compliance queue',
      to: '/admin/approvals',
      icon: ShieldCheck,
      highlight: m.pendingApprovals > 0,
    },
    {
      title: 'Pending Locations',
      value: m.pendingLocations,
      sub: `${m.verifiedLocations} GPS pins verified`,
      to: '/admin/locations',
      icon: MapPin,
      highlight: m.pendingLocations > 0,
    },
    {
      title: 'Bed Inventory',
      value: `${m.occupiedBeds}/${m.totalBeds}`,
      sub: `${m.availableBeds} vacant · ${m.reservedBeds} reserved`,
      to: '/admin/vacancies',
      icon: BedDouble,
    },
    {
      title: 'Tenants & Occupancy',
      value: `${m.occupancyRatePct}%`,
      sub: `${m.activeStays} active stays · ${m.totalTenants} users`,
      to: '/admin/tenants',
      icon: Users,
    },
    {
      title: 'Active Subscriptions',
      value: m.activeSubscriptions,
      sub: 'Paid Pro & Business tiers',
      to: '/admin/subscriptions',
      icon: CreditCard,
    },
    {
      title: 'Lifetime Listings',
      value: m.lifetimeListings,
      sub: '₹199 one-time entitlement',
      to: '/admin/lifetime',
      icon: Award,
    },
    {
      title: 'Local Ads & Events',
      value: `${m.activeLocalAds} · ${m.publishedEvents}`,
      sub: `${m.eventRegistrations} event registrations`,
      to: '/admin/ads',
      icon: Megaphone,
    },
    {
      title: 'Support Tickets',
      value: m.openSupportTickets,
      sub: `${m.openComplaints} open PG complaints`,
      to: '/admin/support',
      icon: LifeBuoy,
      highlight: m.openSupportTickets > 0,
    },
    {
      title: 'Platform Revenue',
      value: formatInr(m.platformTotalRevenueInr),
      sub: 'Subscriptions · Lifetime · Ads · Promos',
      to: '/admin/payments',
      icon: Wallet,
      emerald: true,
    },
    {
      title: 'Owner PG Rent Collected',
      value: formatInr(m.ownerRentCollectedInr),
      sub: 'Owner PG Rent Ledger (Separated)',
      to: '/admin/stays',
      icon: Banknote,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
            {mode === 'analytics' ? 'Platform Analytics & Occupancy' : 'Super Admin Platform Overview'}
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Live metrics computed directly from the shared PG Finder repository. Platform revenue is strictly separated from owner PG rent ledgers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={mode === 'analytics' ? '/admin/dashboard' : '/admin/analytics'}
            className="min-h-[40px] px-4 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center"
          >
            {mode === 'analytics' ? 'Back to Overview' : 'Full Analytics View'}
          </Link>
        </div>
      </div>

      {/* 12 Clickable KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.to}
              className="group rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-[#047857] dark:hover:border-[#34D399] p-4 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] truncate">{card.title}</p>
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    card.highlight
                      ? 'text-[#B45309] dark:text-[#FBBF24]'
                      : 'text-[#047857] dark:text-[#34D399]'
                  }`}
                />
              </div>
              <p
                className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                  card.emerald
                    ? 'text-[#047857] dark:text-[#34D399]'
                    : 'text-[#111827] dark:text-[#F9FAFB]'
                }`}
              >
                {card.value}
              </p>
              <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate tabular-nums">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* Charts + Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                {mode === 'analytics' ? 'Platform Revenue vs. Bed Capacity Mix' : 'Marketplace Monetization Breakdown'}
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Excludes PG tenant rent collected by property owners
              </p>
            </div>
            <Link to="/admin/payments" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
              Ledger →
            </Link>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} />
                <YAxis tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} />
                <Tooltip
                  formatter={(val: any) => formatInr(Number(val))}
                  contentStyle={{
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                    color: isDark ? '#F9FAFB' : '#111827',
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="amount" fill={isDark ? '#34D399' : '#047857'} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {mode === 'analytics' && (
            <div className="mt-6 pt-5 border-t border-[#E5E7EB] dark:border-[#374151]">
              <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] mb-3">Platform Bed Status Distribution</h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bedMixData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} />
                    <YAxis tick={{ fontSize: 12, fill: tickColor }} stroke={gridColor} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                        color: isDark ? '#F9FAFB' : '#111827',
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="count" fill={isDark ? '#10B981' : '#065F46'} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Review &amp; Support Queues</h2>
          <Link
            to="/admin/approvals"
            className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-3 transition-colors"
          >
            <ShieldCheck className="w-5 h-5 text-[#047857] dark:text-[#34D399] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Property Approval Queue</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                {m.pendingApprovals} properties awaiting compliance review
              </p>
            </div>
          </Link>
          <Link
            to="/admin/locations"
            className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-3 transition-colors"
          >
            <MapPin className="w-5 h-5 text-[#047857] dark:text-[#34D399] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Location Verification Queue</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                {m.pendingLocations} locations pending GPS pin check
              </p>
            </div>
          </Link>
          <Link
            to="/admin/support"
            className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-3 transition-colors"
          >
            <LifeBuoy className="w-5 h-5 text-[#047857] dark:text-[#34D399] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Support Tickets &amp; Disputes</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                {m.openSupportTickets} open tickets · {m.openComplaints} PG complaints
              </p>
            </div>
          </Link>
          <Link
            to="/admin/events"
            className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-3 transition-colors"
          >
            <CalendarDays className="w-5 h-5 text-[#047857] dark:text-[#34D399] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Startup Events &amp; Waitlists</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] tabular-nums">
                {m.publishedEvents} published · {m.eventRegistrations} registered
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Owners, Tenants & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Recent PG Owners</h2>
            <Link to="/admin/owners" className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">All →</Link>
          </div>
          {data.owners.slice(0, 4).map((o: any) => (
            <div key={o.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">{o.fullName}</p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                  {o.propertyCount} PGs · {o.subscriptionTier}
                </p>
              </div>
              <StatusIndicator status={o.isSuspended ? 'error' : 'success'} label={o.isSuspended ? 'Suspended' : 'Active'} />
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Recent Tenants &amp; Stays</h2>
            <Link to="/admin/tenants" className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">All →</Link>
          </div>
          {data.tenants.slice(0, 4).map((t: any) => (
            <div key={t.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">{t.fullName}</p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                  {t.currentPgName ? `${t.currentPgName} · Bed ${t.bedCode}` : 'Searching PG'}
                </p>
              </div>
              <StatusIndicator
                status={t.stayStatus === 'ACTIVE' ? 'success' : 'neutral'}
                label={t.stayStatus}
              />
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Upcoming Startup Events</h2>
            <Link to="/admin/events" className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">Manage →</Link>
          </div>
          {data.upcomingEvents.slice(0, 4).map((ev: any) => (
            <div key={ev.id} className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151]">
              <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">{ev.title}</p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                {ev.city} · {new Date(ev.dateTime).toLocaleDateString('en-IN')} · {ev.publicationStatus}
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
