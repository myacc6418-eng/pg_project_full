import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  House,
  Building2,
  ShieldCheck,
  MapPin,
  BedDouble,
  DoorOpen,
  Users,
  UserPlus,
  QrCode,
  LogOut,
  Receipt,
  Wallet,
  AlertOctagon,
  Utensils,
  MessageSquareWarning,
  Wrench,
  UserCheck,
  Activity,
  BarChart3,
  Star,
  CalendarDays,
  CreditCard,
  Sparkles,
  Bell,
  History,
  Settings,
  UserCircle,
  Menu,
  PlusCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../hooks/useTheme';
import { BottomNavigation, BottomNavItem } from '../components/navigation/BottomNavigation';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/owner/dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'properties',
    title: 'Properties & Inventory',
    items: [
      { label: 'My Properties', to: '/owner/properties', icon: Building2 },
      { label: 'PG Approvals', to: '/owner/approvals', icon: ShieldCheck },
      { label: 'Location Verification', to: '/owner/locations', icon: MapPin },
      { label: 'Floors, Rooms & Beds', to: '/owner/rooms-beds', icon: BedDouble },
      { label: 'Vacancies', to: '/owner/vacancies', icon: DoorOpen },
    ],
  },
  {
    id: 'residents',
    title: 'Residents & Onboarding',
    items: [
      { label: 'Tenant Management', to: '/owner/tenants', icon: Users },
      { label: 'Joining Requests', to: '/owner/joining-requests', icon: UserPlus },
      { label: 'QR Onboarding', to: '/owner/qr-onboarding', icon: QrCode },
      { label: 'Checkout Management', to: '/owner/checkouts', icon: LogOut },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Ledger',
    items: [
      { label: 'Rent & Payments', to: '/owner/rent', icon: Receipt },
      { label: 'Expenses', to: '/owner/expenses', icon: Wallet },
      { label: 'Outstanding Dues', to: '/owner/dues', icon: AlertOctagon },
    ],
  },
  {
    id: 'operations',
    title: 'Daily Operations',
    items: [
      { label: 'Food & Mess', to: '/owner/food', icon: Utensils },
      { label: 'Complaints', to: '/owner/complaints', icon: MessageSquareWarning },
      { label: 'Maintenance', to: '/owner/maintenance', icon: Wrench },
      { label: 'Staff Management', to: '/owner/staff', icon: UserCheck },
    ],
  },
  {
    id: 'growth',
    title: 'Insights & Growth',
    items: [
      { label: 'Tracking Center', to: '/owner/tracking', icon: Activity },
      { label: 'Reports & Analytics', to: '/owner/reports', icon: BarChart3 },
      { label: 'Reviews', to: '/owner/reviews', icon: Star },
      { label: 'Startup Events', to: '/owner/events', icon: CalendarDays },
      { label: 'Subscriptions', to: '/owner/subscriptions', icon: CreditCard },
      { label: 'Promotions', to: '/owner/promotions', icon: Sparkles },
    ],
  },
  {
    id: 'system',
    title: 'Account & Audit',
    items: [
      { label: 'Notifications', to: '/owner/notifications', icon: Bell },
      { label: 'Activity Log', to: '/owner/activity-log', icon: History },
      { label: 'Owner Profile', to: '/owner/profile', icon: UserCircle },
      { label: 'Settings', to: '/owner/settings', icon: Settings },
    ],
  },
];

export function OwnerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const mobileTabs: BottomNavItem[] = [
    {
      label: 'Home',
      to: '/owner/dashboard',
      icon: House,
      isActive: (p) => p === '/owner/dashboard' || p.startsWith('/owner/dashboard/'),
    },
    {
      label: 'Properties',
      to: '/owner/properties',
      icon: Building2,
      isActive: (p) => p.startsWith('/owner/properties') || p.startsWith('/owner/add-pg'),
    },
    {
      label: 'Tenants',
      to: '/owner/tenants',
      icon: Users,
      isActive: (p) => p.startsWith('/owner/tenants') || p.startsWith('/owner/joining-requests'),
    },
    {
      label: 'Finance',
      to: '/owner/finance',
      icon: Wallet,
      isActive: (p) =>
        ['/owner/finance', '/owner/rent', '/owner/expenses', '/owner/dues'].some((prefix) =>
          p.startsWith(prefix)
        ),
    },
    {
      label: 'More',
      to: '/owner/more',
      icon: Menu,
      isActive: (p) => p.startsWith('/owner/more'),
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = (user?.fullName || 'Owner')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="h-full min-h-0 w-full bg-[#F8FAFC] dark:bg-[#0B1220] flex overflow-hidden transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-68 lg:h-full shrink-0 bg-white dark:bg-[#111827] border-r border-[#E5E7EB] dark:border-[#374151]">
        <div className="h-16 px-5 shrink-0 flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#374151]">
          <Link to="/owner/dashboard" className="font-display text-lg font-extrabold text-[#047857] dark:text-[#34D399]">
            PG Finder
          </Link>
          <span className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Owner PMS</span>
        </div>

        <nav aria-label="Owner sidebar navigation" className="flex-1 min-h-0 px-3 py-3 space-y-2 overflow-y-auto">
          {SIDEBAR_GROUPS.map((group) => {
            const isCollapsed = Boolean(collapsed[group.id]);
            return (
              <div key={group.id} className="space-y-0.5">
                {group.items.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]"
                  >
                    <span>{group.title}</span>
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                ) : null}

                {!isCollapsed &&
                  group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      location.pathname === item.to ||
                      (item.to !== '/owner/dashboard' && location.pathname.startsWith(`${item.to}/`));
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`min-h-[38px] flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                          active
                            ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-semibold'
                            : 'text-[#4B5563] dark:text-[#D1D5DB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="p-4 shrink-0 border-t border-[#E5E7EB] dark:border-[#374151] space-y-2.5">
          <Link to="/owner/profile" className="flex items-center gap-2.5 group">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-8 h-8 rounded-xl object-cover shrink-0 border border-[#E5E7EB] dark:border-[#374151]" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] truncate group-hover:text-[#047857] dark:group-hover:text-[#34D399]">
                {user?.fullName}
              </p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{user?.businessName || user?.email}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden">
        {/* Desktop Top Utility Bar */}
        <header className="hidden lg:flex shrink-0 z-30 h-16 px-6 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#374151] items-center justify-between">
          <div className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
            {user?.businessName || 'PG Finder Owner Workspace'}
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggleButton />
            <Link
              to="/owner/notifications"
              aria-label="Notifications"
              className="min-h-[40px] min-w-[40px] rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] flex items-center justify-center text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
            >
              <Bell className="w-4 h-4 text-[#047857] dark:text-[#34D399]" />
            </Link>
            <Link
              to="/owner/profile"
              aria-label="Owner Profile"
              className="min-h-[40px] px-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] flex items-center gap-2 text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]"
            >
              <span className="w-6 h-6 rounded-lg bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold text-[11px] flex items-center justify-center">
                {initials}
              </span>
              <span className="hidden xl:inline">Profile</span>
            </Link>
            <Link
              to="/owner/add-pg"
              className="min-h-[40px] px-3.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Add PG
            </Link>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden shrink-0 z-30 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#374151] h-14 px-4 flex items-center justify-between pt-safe">
          <Link to="/owner/dashboard" className="font-display text-lg font-extrabold text-[#047857] dark:text-[#34D399]">
            PG Finder
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggleButton compact />
            <Link
              to="/owner/notifications"
              aria-label="Notifications"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-[#111827] dark:text-[#F9FAFB]"
            >
              <Bell className="w-4 h-4" />
            </Link>
            <Link
              to="/owner/profile"
              aria-label="Owner Profile"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#374151] bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold text-xs"
            >
              {initials}
            </Link>
            <Link
              to="/owner/add-pg"
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add PG</span>
            </Link>
          </div>
        </header>

        {/* Single Independently Scrollable Content Container */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 pb-6 lg:pb-10">
            <Outlet />
          </div>
        </main>

        <BottomNavigation
          items={mobileTabs}
          ariaLabel="Owner mobile navigation"
          visibilityClass="lg:hidden"
        />
      </div>
    </div>
  );
}
