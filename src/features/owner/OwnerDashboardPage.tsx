import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  PlusCircle,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertCircle,
  BedDouble,
  DoorOpen,
  Users,
  UserPlus,
  Receipt,
  Wallet,
  Utensils,
  MessageSquareWarning,
  Wrench,
  UserCheck,
  Activity,
  BarChart3,
  Sparkles,
  Settings,
  QrCode,
  Bell,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ThemeToggleButton, useTheme } from '../../hooks/useTheme';
import { CardSkeleton, EmptyState, formatInr } from '../../components/ui/CommonUI';
import { Bed, BedStatus, OwnerSubscription, Property, RentCharge, StartupEvent } from '../../../packages/shared/types';

interface OwnerOverviewResponse {
  properties: Property[];
  subscription: OwnerSubscription;
  beds: Bed[];
  rentCharges: RentCharge[];
  metrics: {
    totalProperties: number;
    approvedProperties: number;
    pendingProperties: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    vacantBeds: number;
    occupancyRatePct: number;
    activeTenants: number;
    pendingJoiningRequests: number;
    rentCollectedThisMonthInr: number;
    rentCollectedInr: number;
    pendingRentInr: number;
    monthlyExpensesInr: number;
    totalExpensesInr: number;
    outstandingDuesInr: number;
    netOperatingInr: number;
    openComplaints: number;
    pendingMaintenance: number;
    upcomingCheckouts: number;
  };
  todaysOperations: {
    id: string;
    title: string;
    count: number;
    summary: string;
    route: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }[];
}

const QUICK_ACCESS_TILES = [
  { label: 'Add Property', to: '/owner/add-pg', icon: PlusCircle },
  { label: 'Manage Rooms', to: '/owner/rooms-beds', icon: BedDouble },
  { label: 'Manage Beds', to: '/owner/vacancies', icon: DoorOpen },
  { label: 'Add Tenant', to: '/owner/tenants', icon: Users },
  { label: 'Collect Rent', to: '/owner/rent', icon: Receipt },
  { label: 'Add Expense', to: '/owner/expenses', icon: Wallet },
  { label: 'Food Menu', to: '/owner/food', icon: Utensils },
  { label: 'Complaints', to: '/owner/complaints', icon: MessageSquareWarning },
  { label: 'Maintenance', to: '/owner/maintenance', icon: Wrench },
  { label: 'Joining Req.', to: '/owner/joining-requests', icon: UserPlus },
  { label: 'QR Onboard', to: '/owner/qr-onboarding', icon: QrCode },
  { label: 'Staff', to: '/owner/staff', icon: UserCheck },
  { label: 'Tracking', to: '/owner/tracking', icon: Activity },
  { label: 'Reports', to: '/owner/reports', icon: BarChart3 },
  { label: 'Promotions', to: '/owner/promotions', icon: Sparkles },
  { label: 'Settings', to: '/owner/settings', icon: Settings },
];

export function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { resolvedTheme } = useTheme();
  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [data, setData] = useState<OwnerOverviewResponse | null>(null);
  const [events, setEvents] = useState<StartupEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [ov, ev] = await Promise.all([
        apiFetch<OwnerOverviewResponse>(`/api/v1/operations/owner/overview?propertyId=${selectedPropertyId}`),
        apiFetch<{ events: StartupEvent[] }>('/api/v1/events/published'),
      ]);
      setData(ov);
      setEvents(ev.events.slice(0, 3));
    } catch {
      showToast('Could not load owner dashboard', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [selectedPropertyId]);

  if (loading || !data) return <CardSkeleton rows={4} />;

  const initials = (user?.fullName || 'Owner')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  if (data.properties.length === 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#047857] dark:text-[#34D399]">
              {data.subscription?.tier || 'BASIC'} Plan · Instant Access Enabled
            </p>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              Good Morning, {user?.fullName || 'PG Owner'}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Add your first PG property to configure floors, rooms, beds, and QR onboarding.
            </p>
          </div>
          <Link
            to="/owner/profile"
            className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold text-xs flex items-center justify-center shrink-0"
          >
            {initials}
          </Link>
        </div>
        <EmptyState
          icon={Building2}
          title="Add Your First PG Property"
          description="Use the 10-step Add PG Wizard to set up property details, room sharing types, pricing, and location verification."
          actionLabel="Add Your First PG"
          onAction={() => navigate('/owner/add-pg')}
        />
      </div>
    );
  }

  const m = data.metrics;
  const chartData = [
    { name: 'Collected', amount: m.rentCollectedThisMonthInr },
    { name: 'Pending', amount: m.pendingRentInr },
    { name: 'Expenses', amount: m.monthlyExpensesInr },
    { name: 'Dues', amount: m.outstandingDuesInr },
  ];

  const isDark = resolvedTheme === 'dark';
  const tickColor = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor = isDark ? '#374151' : '#E5E7EB';

  const kpiCards = [
    { label: 'Total PGs', value: m.totalProperties, to: '/owner/properties', tone: 'default' },
    { label: 'Active PGs', value: m.approvedProperties, to: '/owner/properties', tone: 'emerald' },
    { label: 'Total Rooms', value: m.totalRooms, to: '/owner/rooms-beds', tone: 'default' },
    { label: 'Total Beds', value: m.totalBeds, to: '/owner/rooms-beds', tone: 'default' },
    { label: 'Occupied Beds', value: m.occupiedBeds, to: '/owner/rooms-beds', tone: 'emerald' },
    { label: 'Vacant Beds', value: m.vacantBeds, to: '/owner/vacancies', tone: 'default' },
    { label: 'Active Tenants', value: m.activeTenants, to: '/owner/tenants', tone: 'default' },
    { label: 'Pending Rent', value: formatInr(m.pendingRentInr), to: '/owner/rent', tone: m.pendingRentInr > 0 ? 'amber' : 'default' },
    { label: 'Monthly Collection', value: formatInr(m.rentCollectedThisMonthInr), to: '/owner/rent', tone: 'emerald' },
    { label: 'Pending Requests', value: m.pendingJoiningRequests, to: '/owner/joining-requests', tone: m.pendingJoiningRequests > 0 ? 'amber' : 'default' },
    { label: 'Open Complaints', value: m.openComplaints, to: '/owner/complaints', tone: m.openComplaints > 0 ? 'amber' : 'default' },
    { label: 'Maintenance Tasks', value: m.pendingMaintenance, to: '/owner/maintenance', tone: m.pendingMaintenance > 0 ? 'amber' : 'default' },
  ];

  const displayedProperties =
    selectedPropertyId === 'ALL'
      ? data.properties
      : data.properties.filter((p) => p.id === selectedPropertyId);

  return (
    <div className="space-y-5">
      {/* SECTION 1: Welcome Header */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            to="/owner/profile"
            aria-label="Open owner profile"
            className="w-11 h-11 rounded-2xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold text-sm flex items-center justify-center shrink-0 border border-[#047857]/20 dark:border-[#34D399]/30 overflow-hidden"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#047857] dark:text-[#34D399] uppercase tracking-wide">
              {data.subscription?.tier || 'BASIC'} Plan · {m.occupancyRatePct}% Occupancy
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
              Good Morning, {user?.fullName || 'PG Owner'}
            </h1>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">
              Here&apos;s what&apos;s happening across your PG properties.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] max-w-[200px]"
          >
            <option value="ALL">All PGs ({data.properties.length})</option>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <Link
            to="/owner/notifications"
            aria-label="Notifications"
            className="min-h-[40px] min-w-[40px] rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex items-center justify-center text-[#111827] dark:text-[#F9FAFB]"
          >
            <Bell className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
          </Link>
          <div className="lg:hidden">
            <ThemeToggleButton compact />
          </div>
          <Link
            to="/owner/qr-onboarding"
            className="min-h-[40px] px-3 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] inline-flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
            <span>QR Join</span>
          </Link>
        </div>
      </section>

      {/* SECTION 2: Compact 12 Summary KPI Cards */}
      <section aria-label="Portfolio key metrics">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {kpiCards.map((k) => (
            <Link
              key={k.label}
              to={k.to}
              className="rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-[#047857] dark:hover:border-[#34D399] p-3 flex flex-col justify-between transition-colors shadow-2xs"
            >
              <p className="text-[11px] font-medium text-[#6B7280] dark:text-[#9CA3AF] truncate">{k.label}</p>
              <p
                className={`mt-1 font-mono text-base sm:text-lg font-bold tabular-nums leading-tight ${
                  k.tone === 'emerald'
                    ? 'text-[#047857] dark:text-[#34D399]'
                    : k.tone === 'amber'
                      ? 'text-[#B45309] dark:text-amber-400'
                      : 'text-[#111827] dark:text-[#F9FAFB]'
                }`}
              >
                {k.value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3: Compact Quick Access Grid (16 Actionable Tiles) */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Quick Access</h2>
          <Link to="/owner/more" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
            All modules
          </Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {QUICK_ACCESS_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.label}
                to={tile.to}
                className="group p-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937]/70 hover:border-[#047857] dark:hover:border-[#34D399] hover:bg-[#ECFDF5]/60 dark:hover:bg-[#10B981]/10 flex flex-col items-center justify-center text-center gap-1.5 transition-colors min-h-[70px]"
              >
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] flex items-center justify-center text-[#047857] dark:text-[#34D399] group-hover:scale-105 transition-transform">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-semibold text-[#111827] dark:text-[#F9FAFB] leading-tight line-clamp-2">
                  {tile.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 4 & 6: Today's Operations + Financial Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Today&apos;s Operations</h2>
            <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Actionable Queue</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.todaysOperations.map((op) => {
              const Icon =
                op.severity === 'error'
                  ? AlertCircle
                  : op.severity === 'warning'
                    ? AlertTriangle
                    : op.severity === 'info'
                      ? Info
                      : CheckCircle2;
              const iconColor =
                op.severity === 'error'
                  ? 'text-[#DC2626] dark:text-red-400'
                  : op.severity === 'warning'
                    ? 'text-[#D97706] dark:text-amber-400'
                    : op.severity === 'info'
                      ? 'text-[#0284C7] dark:text-sky-400'
                      : 'text-[#047857] dark:text-[#34D399]';
              return (
                <Link
                  key={op.id}
                  to={op.route}
                  className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">{op.title}</p>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{op.summary}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Financial Snapshot</h2>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Net Operating: <span className="font-mono font-bold text-[#047857] dark:text-[#34D399]">{formatInr(m.netOperatingInr)}</span>
              </p>
            </div>
            <Link to="/owner/reports" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
              Full reports
            </Link>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} stroke={gridColor} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} stroke={gridColor} />
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
        </section>
      </div>

      {/* SECTION 5: Property Performance Overview */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Property Performance</h2>
          <Link to="/owner/properties" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
            Manage properties
          </Link>
        </div>
        <div className="space-y-2.5">
          {displayedProperties.map((prop) => {
            const propBeds = data.beds.filter((b) => b.propertyId === prop.id);
            const occupied = propBeds.filter((b) => b.status === BedStatus.OCCUPIED).length;
            const vacant = propBeds.filter((b) => b.status === BedStatus.AVAILABLE).length;
            const occPct = propBeds.length > 0 ? Math.round((occupied / propBeds.length) * 100) : 0;
            const pendingRent = data.rentCharges
              .filter((r) => r.propertyId === prop.id && r.status !== 'WAIVED')
              .reduce((acc, r) => acc + Math.max(0, r.amountInr + (r.lateFeeInr || 0) - r.paidAmountInr), 0);
            return (
              <div
                key={prop.id}
                className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] truncate">{prop.name}</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {prop.locality}, {prop.city} · {prop.approvalStatus.replace(/_/g, ' ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Occupancy</p>
                    <p className="font-mono font-bold text-[#047857] dark:text-[#34D399] tabular-nums">{occPct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Total Beds</p>
                    <p className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{propBeds.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Vacant</p>
                    <p className="font-mono font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{vacant}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Pending Rent</p>
                    <p className="font-mono font-bold text-[#B45309] dark:text-amber-400 tabular-nums">{formatInr(pendingRent)}</p>
                  </div>
                  <Link
                    to={`/owner/properties/${prop.id}`}
                    className="min-h-[34px] px-3 rounded-lg bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] text-xs font-semibold text-[#047857] dark:text-[#34D399] inline-flex items-center gap-1"
                  >
                    View Property
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 7: Upcoming Startup Events (Max 3 items) */}
      <section className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Upcoming Startup Events</h2>
          </div>
          <Link to="/owner/events" className="text-xs font-semibold text-[#047857] dark:text-[#34D399] hover:underline">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {events.map((ev) => (
            <Link
              key={ev.id}
              to="/owner/events"
              className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] hover:border-[#047857] dark:hover:border-[#34D399] transition-colors"
            >
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                {ev.category} · {ev.city}
              </p>
              <p className="mt-1 text-xs sm:text-sm font-bold text-[#111827] dark:text-[#F9FAFB] line-clamp-1">{ev.title}</p>
              <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{ev.venue}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
