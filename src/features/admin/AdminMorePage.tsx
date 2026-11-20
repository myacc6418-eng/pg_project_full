import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Users,
  MapPin,
  Building2,
  BedDouble,
  CreditCard,
  Award,
  Wallet,
  Sparkles,
  Megaphone,
  Smartphone,
  CalendarDays,
  ClipboardList,
  LifeBuoy,
  MessageSquareWarning,
  UserPlus,
  Home,
  LogOut as CheckoutIcon,
  BellRing,
  FileText,
  BarChart3,
  Activity,
  History,
  Shield,
  Settings,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ThemeToggleButton } from '../../hooks/useTheme';

const ADMIN_SECTIONS = [
  {
    title: 'Users & Governance',
    items: [
      { label: 'Owner Management', to: '/admin/owners', icon: UserCheck },
      { label: 'Tenant Management', to: '/admin/tenants', icon: Users },
      { label: 'Roles & Permissions', to: '/admin/roles', icon: Shield },
    ],
  },
  {
    title: 'Properties & Operations',
    items: [
      { label: 'Location Verification', to: '/admin/locations', icon: MapPin },
      { label: 'Property Directory', to: '/admin/properties', icon: Building2 },
      { label: 'Vacancies', to: '/admin/vacancies', icon: BedDouble },
      { label: 'Joining Requests', to: '/admin/joining', icon: UserPlus },
      { label: 'Active Stays', to: '/admin/stays', icon: Home },
      { label: 'Checkout Records', to: '/admin/checkouts', icon: CheckoutIcon },
      { label: 'Complaints & Disputes', to: '/admin/complaints', icon: MessageSquareWarning },
      { label: 'Support Tickets', to: '/admin/support', icon: LifeBuoy },
    ],
  },
  {
    title: 'Monetization & Ads',
    items: [
      { label: 'Subscriptions', to: '/admin/subscriptions', icon: CreditCard },
      { label: 'Lifetime Listings', to: '/admin/lifetime', icon: Award },
      { label: 'Payments & Refunds', to: '/admin/payments', icon: Wallet },
      { label: 'Featured Promotions', to: '/admin/promotions', icon: Sparkles },
      { label: 'Advertisements', to: '/admin/ads', icon: Megaphone },
      { label: 'AdMob', to: '/admin/admob', icon: Smartphone },
    ],
  },
  {
    title: 'Engagement, Analytics & System',
    items: [
      { label: 'Startup Events', to: '/admin/events', icon: CalendarDays },
      { label: 'Event Registrations', to: '/admin/registrations', icon: ClipboardList },
      { label: 'Broadcast Notifications', to: '/admin/notifications', icon: BellRing },
      { label: 'CMS', to: '/admin/cms', icon: FileText },
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
      { label: 'Activity Log', to: '/admin/activity', icon: Activity },
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: History },
      { label: 'Settings & Integrations', to: '/admin/settings', icon: Settings },
    ],
  },
];

export function AdminMorePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0">
            <UserCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
              {user?.fullName || 'Super Administrator'}
            </h1>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">
              {user?.email} · Super Admin Console
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-[42px] px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-xs font-semibold text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {ADMIN_SECTIONS.map((sec) => (
        <section key={sec.title} className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
            {sec.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="min-h-[60px] p-3.5 rounded-2xl border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#111827] hover:border-[#047857] dark:hover:border-[#34D399] flex items-center gap-3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] dark:bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
