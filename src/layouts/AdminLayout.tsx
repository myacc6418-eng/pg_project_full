import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  Users,
  UserCheck,
  Shield,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  MapPin,
  BedDouble,
  UserPlus,
  Home,
  LogOut as CheckoutIcon,
  MessageSquareWarning,
  LifeBuoy,
  CreditCard,
  Award,
  Wallet,
  Sparkles,
  Megaphone,
  Smartphone,
  CalendarDays,
  ClipboardList,
  BellRing,
  FileText,
  History,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../hooks/useTheme';
import { BottomNavigation, BottomNavItem } from '../components/navigation/BottomNavigation';

interface NavGroup {
  group: string;
  items: { label: string; to: string; icon: React.ComponentType<{ className?: string }> }[];
}

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navGroups: NavGroup[] = [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Platform Analytics', to: '/admin/analytics', icon: BarChart3 },
        { label: 'Activity Log', to: '/admin/activity', icon: Activity },
      ],
    },
    {
      group: 'Users',
      items: [
        { label: 'PG Owners', to: '/admin/owners', icon: UserCheck },
        { label: 'Tenants', to: '/admin/tenants', icon: Users },
        { label: 'Admin Roles', to: '/admin/roles', icon: Shield },
      ],
    },
    {
      group: 'Properties',
      items: [
        { label: 'All Properties', to: '/admin/properties', icon: Building2 },
        { label: 'PG Approvals', to: '/admin/approvals', icon: ShieldCheck },
        { label: 'Location Verification', to: '/admin/locations', icon: MapPin },
        { label: 'Rooms & Vacancies', to: '/admin/vacancies', icon: BedDouble },
      ],
    },
    {
      group: 'Operations',
      items: [
        { label: 'Joining Requests', to: '/admin/joining', icon: UserPlus },
        { label: 'Active Stays', to: '/admin/stays', icon: Home },
        { label: 'Checkout Records', to: '/admin/checkouts', icon: CheckoutIcon },
        { label: 'Complaints & Disputes', to: '/admin/complaints', icon: MessageSquareWarning },
        { label: 'Support Tickets', to: '/admin/support', icon: LifeBuoy },
      ],
    },
    {
      group: 'Monetization',
      items: [
        { label: 'Subscriptions', to: '/admin/subscriptions', icon: CreditCard },
        { label: 'Lifetime Listings', to: '/admin/lifetime', icon: Award },
        { label: 'Payments', to: '/admin/payments', icon: Wallet },
        { label: 'Featured Promotions', to: '/admin/promotions', icon: Sparkles },
        { label: 'Local Business Ads', to: '/admin/ads', icon: Megaphone },
        { label: 'AdMob Settings', to: '/admin/admob', icon: Smartphone },
      ],
    },
    {
      group: 'Engagement',
      items: [
        { label: 'Startup Events', to: '/admin/events', icon: CalendarDays },
        { label: 'Event Registrations', to: '/admin/registrations', icon: ClipboardList },
        { label: 'Broadcast Notifications', to: '/admin/notifications', icon: BellRing },
        { label: 'CMS', to: '/admin/cms', icon: FileText },
      ],
    },
    {
      group: 'System',
      items: [
        { label: 'Audit Logs', to: '/admin/audit-logs', icon: History },
        { label: 'Integrations & Settings', to: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const mobileTabs: BottomNavItem[] = [
    {
      label: 'Home',
      to: '/admin/dashboard',
      icon: LayoutDashboard,
      isActive: (p) => p === '/admin/dashboard' || p.startsWith('/admin/dashboard/'),
    },
    {
      label: 'Properties',
      to: '/admin/properties',
      icon: Building2,
      isActive: (p) => p.startsWith('/admin/properties'),
    },
    {
      label: 'Users',
      to: '/admin/users',
      icon: Users,
      isActive: (p) =>
        ['/admin/users', '/admin/owners', '/admin/tenants', '/admin/roles'].some((prefix) =>
          p.startsWith(prefix)
        ),
    },
    {
      label: 'Approvals',
      to: '/admin/approvals',
      icon: ClipboardCheck,
      isActive: (p) =>
        ['/admin/approvals', '/admin/locations', '/admin/location-verification'].some((prefix) =>
          p.startsWith(prefix)
        ),
    },
    {
      label: 'More',
      to: '/admin/more',
      icon: Menu,
      isActive: (p) => p.startsWith('/admin/more'),
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavGroups = (onItemClick?: () => void) => (
    <div className="space-y-4">
      {navGroups.map((section) => (
        <div key={section.group}>
          <p className="px-3.5 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
            {section.group}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onItemClick}
                  className={`min-h-[40px] flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-semibold'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full min-h-0 w-full bg-[#F8FAFC] dark:bg-[#0B1220] flex overflow-hidden transition-colors">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:h-full shrink-0 bg-white dark:bg-[#111827] border-r border-[#E5E7EB] dark:border-[#374151]">
        <div className="h-16 px-6 shrink-0 flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#374151]">
          <Link to="/admin/dashboard" className="font-display text-lg font-extrabold text-[#047857] dark:text-[#34D399]">
            PG Finder
          </Link>
          <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Admin</span>
        </div>
        <nav aria-label="Admin sidebar navigation" className="flex-1 min-h-0 px-3 py-4 overflow-y-auto">
          {renderNavGroups()}
        </nav>
        <div className="p-4 shrink-0 border-t border-[#E5E7EB] dark:border-[#374151] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">{user?.fullName}</p>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">Super Administrator</p>
            </div>
            <ThemeToggleButton compact />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#374151] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden">
        <header className="lg:hidden shrink-0 z-30 bg-white dark:bg-[#111827] border-b border-[#E5E7EB] dark:border-[#374151] h-14 px-4 flex items-center justify-between pt-safe">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open admin navigation"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#111827] dark:text-[#F9FAFB]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display text-base font-bold text-[#047857] dark:text-[#34D399]">Super Admin</span>
          <div className="flex items-center gap-1.5">
            <ThemeToggleButton compact />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#111827] dark:text-[#F9FAFB]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
            <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#111827] h-full flex flex-col p-4 z-10 border-r border-[#E5E7EB] dark:border-[#374151]">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#374151]">
                <span className="font-display text-lg font-extrabold text-[#047857] dark:text-[#34D399]">PG Finder Admin</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close admin navigation"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#111827] dark:text-[#F9FAFB]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 min-h-0 py-4 overflow-y-auto">{renderNavGroups(() => setDrawerOpen(false))}</nav>
            </div>
          </div>
        )}

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 pb-6 lg:pb-10">
            <Outlet />
          </div>
        </main>

        <BottomNavigation
          items={mobileTabs}
          ariaLabel="Admin mobile navigation"
          visibilityClass="lg:hidden"
        />
      </div>
    </div>
  );
}
